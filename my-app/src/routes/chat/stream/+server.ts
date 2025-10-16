import type { RequestHandler } from '@sveltejs/kit';
import { subscribe, toSseChunk } from '$lib/realtime';

export const GET: RequestHandler = async ({ request, locals }) => {
  const userId = locals.user?.id;
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;
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
          if (unsubscribe) unsubscribe();
        }
      };

      safeEnqueue('retry: 3000\n\n');
      safeEnqueue(': connected\n\n');

      // Subscribe with userId so we can filter out our own messages
      unsubscribe = subscribe(userId, (event) => {
        safeEnqueue(toSseChunk(event));
      });

      heartbeat = setInterval(() => {
        safeEnqueue(': ping\n\n');
      }, 15000);

      
      request.signal.addEventListener('abort', () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
      });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
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


