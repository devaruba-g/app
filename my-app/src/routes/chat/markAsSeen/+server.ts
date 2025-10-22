import type { RequestHandler } from '@sveltejs/kit';
import { markMessagesAsSeen } from '$lib/db/queries';

// Mark messages as seen between two users

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const form = await request.formData();
    const sender_id = form.get('sender_id') as string;
    const receiver_id = locals.user?.id;

    if (!receiver_id || !sender_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing data' }),
        { status: 400 }
      );
    }

    await markMessagesAsSeen(sender_id, receiver_id);

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Database error' }),
      { status: 500 }
    );
  }
};
