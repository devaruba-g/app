import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ params, locals }) => {
   const { userId } = params as { userId: string };
  const me = locals.user?.id;
  if (!me || !userId)
    return new Response(JSON.stringify({ success: false }), { status: 400 });

  await db.execute(
    'UPDATE chat SET seen = TRUE WHERE sender_id = ? AND receiver_id = ?',
    [userId, me]
  );

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
