import type { RequestHandler } from '@sveltejs/kit';
import { getMaxMessageIdForUser, getNewMessagesForUser } from '$lib/db/queries';

export const GET: RequestHandler = async ({ request, locals }) => {
  const userId = locals.user?.id;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let poller: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastId = 0;

  try {
    lastId = await getMaxMessageIdForUser(userId);
  } catch (e) {
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

      safeEnqueue('retry: 3000\n\n');
      safeEnqueue(': connected\n\n');

      heartbeat = setInterval(() => {
        safeEnqueue(': ping\n\n');
      }, 15000);


      const pollIntervalMs = 1500;
      poller = setInterval(async () => {
        if (closed) return;
        try {
          const messages = await getNewMessagesForUser(userId, lastId, 100);
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
         
        }
      }, pollIntervalMs);


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


