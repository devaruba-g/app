import type { RequestHandler } from '@sveltejs/kit';
import { updateUserLastActive } from '$lib/db/queries';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = locals.user.id;

  try {
    await updateUserLastActive(userId);
    return new Response('ok');
  } catch (err) {
    console.error('Error updating last_active_at:', err);
    return new Response('error', { status: 500 });
  }
};
