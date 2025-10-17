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
  created_at: Date;
}
export let load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user)
    throw redirect(302, '/');
  let [rows] = await db.execute<users[]>(`
  SELECT id, name, last_active_at,
         CASE WHEN last_active_at> NOW() - INTERVAL 3 SECOND THEN 1 ELSE 0 END AS isOnline
  FROM auth_user
  WHERE id != ?
`, [locals.user.id]);

  let users = rows.map(u => ({
    ...u,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0073B1&color=ffffff&size=128`

    ,
    isOnline: !!u.isOnline,
  }));

  const selectedUserId = url.searchParams.get('user');
  let messages: ChatMessage[] = [];
  try {
    let [messageRows] = await db.execute<ChatMessage[]>(
      'SELECT * FROM chat WHERE sender_id=? OR receiver_id=? ORDER BY id ASC',
      [locals.user.id, locals.user.id]
    );
    messages = messageRows;
  } catch (error) {
    console.error('Error loading messages:', error);
  }

  return {
    user: locals.user, users, messages, selectedUserId
  };
};
export let actions: Actions = {
  loadMessages: async ({ request, locals }) => {
    try {
      let form = await request.formData();
      let otherUserId = form.get('user_id') as string;
      let me = locals.user?.id;
      if (!me || !otherUserId) return { messages: [] };
      let [rows] = await db.execute<ChatMessage[]>(
        'SELECT * FROM chat WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY id ASC',
        [me, otherUserId, otherUserId, me]
      );
      return { messages: rows };
    } catch {
      return { messages: [] };
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
