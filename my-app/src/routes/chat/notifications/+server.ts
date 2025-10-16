import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const [rows] = await db.execute(`
      SELECT 
        c.sender_id,
        c.content,
        c.created_at,
        c.id,
        c.message_type,
        c.file_path,
        u.name as sender_name
      FROM chat c
      JOIN auth_user u ON c.sender_id = u.id
      WHERE c.receiver_id = ? AND c.seen = 0 
      ORDER BY c.created_at DESC
    `, [locals.user.id]);

    const messagesBySender: {[userId: string]: any[]} = {};
    const unseenCounts: {[userId: string]: number} = {};
    
    for (const row of rows as any[]) {
      if (!messagesBySender[row.sender_id]) {
        messagesBySender[row.sender_id] = [];
        unseenCounts[row.sender_id] = 0;
      }
      messagesBySender[row.sender_id].push({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        message_type: row.message_type,
        file_path: row.file_path,
        sender_name: row.sender_name
      });
      unseenCounts[row.sender_id]++;
    }

    return new Response(JSON.stringify({ 
      unseenMessages: unseenCounts,
      messagesBySender 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error loading notification counts:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { userId, messageId } = await request.json();
    
    if (messageId) {
      await db.execute(`
        UPDATE chat 
        SET seen = 1 
        WHERE id = ? AND receiver_id = ?
      `, [messageId, locals.user.id]);
    } else if (userId) {
  
      await db.execute(`
        UPDATE chat 
        SET seen = 1 
        WHERE sender_id = ? AND receiver_id = ?
      `, [userId, locals.user.id]);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
