import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ request, locals }) => {
  const userId = locals.user?.id;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let poller: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastId = 0;

  // Initialize lastId to the current max id for this receiver to avoid replaying history
  try {
    const [rows] = await db.execute<any[]>(
      'SELECT COALESCE(MAX(id), 0) AS maxId FROM chat WHERE receiver_id = ?',
      [userId]
    );
    lastId = (rows as any)[0]?.maxId ?? 0;
  } catch (e) {
    // fallback to 0
    lastId = 0;
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch (e) {
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          if (poller) clearInterval(poller);
        }
      };

      // SSE prelude
      safeEnqueue('retry: 3000\n\n');
      safeEnqueue(': connected\n\n');

      // Heartbeat
      heartbeat = setInterval(() => {
        safeEnqueue(': ping\n\n');
      }, 15000);

      // Poll DB for new messages for this user and stream them as they arrive
      const pollIntervalMs = 1500;
      poller = setInterval(async () => {
        if (closed) return;
        try {
          const [rows] = await db.execute<any[]>(
            'SELECT id, sender_id, receiver_id, content, message_type, file_path, created_at FROM chat WHERE receiver_id = ? AND id > ? ORDER BY id ASC LIMIT 100',
            [userId, lastId]
          );
          const messages: any[] = rows as any[];
          if (messages.length > 0) {
            for (const msg of messages) {
              const data = {
                id: msg.id,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                content: msg.content,
                message_type: msg.message_type,
                file_path: msg.file_path,
                created_at: msg.created_at,
              };
              safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
            }
            lastId = messages[messages.length - 1].id;
          }
        } catch (e) {
          // backoff on error
        }
      }, pollIntervalMs);

      // Cleanup on client abort
      request.signal.addEventListener('abort', () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (poller) clearInterval(poller);
      });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (poller) clearInterval(poller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
};


