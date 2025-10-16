import { db } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';
import type { RowDataPacket } from 'mysql2/promise';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const form = await request.formData();
    const otherUserId = form.get('user_id') as string;
    const myId = locals.user?.id;

    if (!myId || !otherUserId) {
      return new Response(JSON.stringify({ messages: [] }), { status: 400 });
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT * FROM chat WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at ASC',
      [myId, otherUserId, otherUserId, myId]
    );

    const messages = rows.map((r) => ({
      id: r.id,
      sender_id: r.sender_id,
      receiver_id: r.receiver_id,
      content: r.content,
      message_type: r.message_type,
      file_path: r.file_path || null,
      created_at: r.created_at,
    }));

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
