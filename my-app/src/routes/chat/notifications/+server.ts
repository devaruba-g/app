import type { RequestHandler } from '@sveltejs/kit';
import { getUnseenMessagesWithSenders, markMessageAsSeenById, markAllMessagesAsSeenFromSender } from '$lib/db/queries';
import type { NotificationMessage } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const rows = await getUnseenMessagesWithSenders(locals.user.id);

    const messagesBySender: {[userId: string]: NotificationMessage[]} = {};
    const unseenCounts: {[userId: string]: number} = {};
    
    for (const row of rows) {
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
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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
      await markMessageAsSeenById(messageId, locals.user.id);
    } else if (userId) {
      await markAllMessagesAsSeenFromSender(userId, locals.user.id);
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
