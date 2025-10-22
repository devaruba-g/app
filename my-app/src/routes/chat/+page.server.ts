import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { getAllUsersExcept, getAllMessagesForUser, getMessagesBetweenUsers, type ChatMessageRow } from '$lib/db/queries';
export let load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user)
    throw redirect(302, '/');
  
  const rows = await getAllUsersExcept(locals.user.id);

  let users = rows.map(u => ({
    ...u,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0073B1&color=ffffff&size=128`,
    isOnline: !!u.isOnline,
  }));

  const selectedUserId = url.searchParams.get('user');
  let messages: ChatMessageRow[] = [];
  try {
    messages = await getAllMessagesForUser(locals.user.id);
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
      const messages = await getMessagesBetweenUsers(me, otherUserId);
      return { messages };
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
