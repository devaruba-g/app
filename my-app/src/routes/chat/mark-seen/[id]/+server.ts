import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ params }) => {
  const messageId = Number(params.id);
  if (!messageId) return new Response(JSON.stringify({ success: false }), { status: 400 });

  await db.execute('UPDATE chat SET seen = TRUE WHERE id = ?', [messageId]);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};