import type { RequestHandler } from '@sveltejs/kit';
import { getMessagesBetweenUsers } from '$lib/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const form = await request.formData();
    const otherUserId = form.get('user_id') as string;
    const myId = locals.user?.id;

    if (!myId || !otherUserId) {
      return new Response(JSON.stringify({ messages: [] }), { status: 400 });
    }

    const messages = await getMessagesBetweenUsers(myId, otherUserId);

    return new Response(JSON.stringify({ messages }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
  } catch (err) {
    console.error('Load messages error:', err);
    return new Response(JSON.stringify({ messages: [] }), { status: 500 });
  }
};
