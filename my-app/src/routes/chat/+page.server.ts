import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db';
import { publish } from '$lib/realtime';
import { redirect } from '@sveltejs/kit';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface users extends RowDataPacket {
  id: string;
  name: string;
}

interface ChatMessage extends RowDataPacket {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string | null;
  msg_type: 'text' | 'image';
  created_at: Date;
  seen: boolean;
}

export let load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user)
    throw redirect(302, '/');


  let [allUsersRows] = await db.execute<users[]>('SELECT id, name FROM auth_user WHERE id != ?', [locals.user.id]);
  let allUsers = allUsersRows.map(u => ({
    ...u,
    avatar: `https://joeschmoe.io/api/v1/${u.id}`
  }));


  let [chatUsersRows] = await db.execute<users[]>(`
    SELECT DISTINCT u.id, u.name 
    FROM auth_user u 
    WHERE u.id != ? 
    AND u.id IN (
      SELECT DISTINCT sender_id FROM chat WHERE receiver_id = ?
      UNION
      SELECT DISTINCT receiver_id FROM chat WHERE sender_id = ?
    )
  `, [locals.user.id, locals.user.id, locals.user.id]);

  let chatUsers = chatUsersRows.map(u => ({
    ...u,
    avatar: `https://joeschmoe.io/api/v1/${u.id}`
  }));

  const selectedUserId = url.searchParams.get('user');
  let messages: ChatMessage[] = [];
  if (selectedUserId) {
    try {
      let [messageRows] = await db.execute<ChatMessage[]>(
        'SELECT * FROM chat WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at ASC',
        [locals.user.id, selectedUserId, selectedUserId, locals.user.id]
      );
      messages = messageRows;
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }
   if (selectedUserId) {

  await db.execute(
    'UPDATE chat SET seen = TRUE WHERE sender_id = ? AND receiver_id = ? AND seen = FALSE',
    [selectedUserId, locals.user.id]
  );

  try {
    let [messageRows] = await db.execute<ChatMessage[]>(
      'SELECT * FROM chat WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at ASC',
      [locals.user.id, selectedUserId, selectedUserId, locals.user.id]
    );
    messages = messageRows;
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

let [unseenRows] = await db.execute<ChatMessage[]>(
  'SELECT * FROM chat WHERE receiver_id = ? AND seen = FALSE' + (selectedUserId ? ' AND sender_id != ?' : '') + ' ORDER BY created_at ASC',
  selectedUserId ? [locals.user.id, selectedUserId] : [locals.user.id]
);



  return {
    user: locals.user,
    users: chatUsers,
    allUsers,
    chatUsers,
    messages,
    selectedUserId,
    unseenMessages: unseenRows
  };
};

export let actions: Actions = {
  sendMessage: async ({ request, locals }) => {
    try {
      let form = await request.formData();
      let content = (form.get('content') as string)?.trim();
      let type = (form.get('type') as string) || 'text';

      let receiver_id = form.get('receiver_id') as string;
      let sender_id = locals.user?.id;
      if (!sender_id) return { success: false, message: 'You must be logged in' };
      if (!receiver_id || !content) return { success: false, message: 'Missing data' };


const now = new Date();
const offset = now.getTimezoneOffset() * 60000; 
const localTime = new Date(now.getTime() - offset);
const mysqlTime = localTime.toISOString().slice(0, 19).replace('T', ' ');

let result;
try {
  [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO chat (sender_id, receiver_id, content, msg_type, created_at, seen) VALUES (?, ?, ?, ?, ?, FALSE)',
    [sender_id, receiver_id, content, type, mysqlTime]
  );
} catch {}



      const insertedId = (result as ResultSetHeader).insertId;
      publish({
        type: 'message',
        data: { 
          id: insertedId, 
          sender_id, 
          receiver_id, 
          content, 
          image_url: null,
          msg_type: type as 'text' | 'image',
          created_at: mysqlTime
        }
      });
      return { success: true, id: insertedId };
    } catch (err) {
      console.error('Send message error:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Database error' };
    }
  },

  loadMessages: async ({ request, locals }) => {
    try {
      let form = await request.formData();
      let otherUserId = form.get('user_id') as string;
      let me = locals.user?.id;
      if (!me || !otherUserId) return { messages: [] };
      let [rows] = await db.execute<ChatMessage[]>(
        'SELECT * FROM chat WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at ASC',
        [me, otherUserId, otherUserId, me]
      );
      return { messages: rows };
    } catch {
      return { messages: [] };
    }
  },

  deleteMessage: async ({ request, locals }) => {
    try {
      const form = await request.formData();
      const messageId = Number(form.get('message_id'));
      const userId = locals.user?.id;
      if (!userId || !messageId) return { success: false, message: 'Missing data' };
      await db.execute('DELETE FROM chat WHERE id=? AND sender_id=?', [messageId, userId]);
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Database error' };
    }
  },

  logout: async ({ cookies, locals }) => {
    if (!locals.session) {
      return { success: false, message: 'Not authenticated!' };
    }
    let { auth } = await import('$lib/db');
    await auth.invalidateSession(locals.session.id);
    let sessionCookie = auth.createBlankSessionCookie();
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
    throw redirect(302, '/');
  }
};