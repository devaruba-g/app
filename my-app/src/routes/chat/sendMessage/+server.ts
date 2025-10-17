import { db } from '$lib/db';
import { publish } from '$lib/realtime';
import type { RequestHandler } from '@sveltejs/kit';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

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

    const [result] = await db.execute(
  'INSERT INTO chat (sender_id, receiver_id, content, message_type, seen) VALUES (?, ?, ?, ?, 0)',
  [sender_id, receiver_id, content, 'text']
);


    const insertedId = (result as any).insertId;

    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT * FROM chat WHERE id = ?',
      [insertedId]
    );

    const message = rows[0];


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
