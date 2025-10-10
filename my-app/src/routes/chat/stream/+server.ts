import type { RequestHandler } from '@sveltejs/kit';
import { pollNewMessages, toSseChunk } from '$lib/realtime';

export const GET: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = locals.user.id;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastPoll = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch (e) {
          closed = true;
          if (pollInterval) clearInterval(pollInterval);
        }
      };

      safeEnqueue('retry: 3000\n\n');
      safeEnqueue(': connected\n\n');

      pollInterval = setInterval(async () => {
        try {
          const events = await pollNewMessages(userId, lastPoll);
          lastPoll = new Date();
          
          for (const event of events) {
            safeEnqueue(toSseChunk(event));
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);

      request.signal.addEventListener('abort', () => {
        closed = true;
        if (pollInterval) clearInterval(pollInterval);
      });
    },

    cancel() {
      closed = true;
      if (pollInterval) clearInterval(pollInterval);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};