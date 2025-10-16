import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = locals.user.id;

  try {
    await db.query('UPDATE auth_user SET last_active_at= NOW() WHERE id = ?', [userId]);
    return new Response('ok');
  } catch (err) {
    console.error('Error updating last_active_at:', err);
    return new Response('error', { status: 500 });
  }
};
