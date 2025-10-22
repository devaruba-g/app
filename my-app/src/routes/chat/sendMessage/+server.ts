import { publish } from '$lib/realtime';
import type { RequestHandler } from '@sveltejs/kit';
import { insertTextMessage, getMessageById } from '$lib/db/queries';

// Send a text message from one user to another

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const form = await request.formData();
    const content = (form.get('content') as string)?.trim();
    const receiver_id = form.get('receiver_id') as string;
    const sender_id = locals.user?.id;

    if (!sender_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'You must be logged in' }),
        { status: 401 }
      );
    }

    if (!receiver_id || !content) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing data' }),
        { status: 400 }
      );
    }

    const insertedId = await insertTextMessage(sender_id, receiver_id, content);

    const message = await getMessageById(insertedId);


    publish({
      type: 'message',
      data: {
        id: insertedId,
        sender_id,
        receiver_id,
        content,
        message_type: 'text',
        created_at: message.created_at
      },
      excludeUserId: sender_id 
    });

    return new Response(
      JSON.stringify({ success: true, id: insertedId, created_at: message.created_at }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Database error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Database error' }),
      { status: 500 }
    );
  }
};
