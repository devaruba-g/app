import type { RequestHandler } from '@sveltejs/kit';
import type { RowDataPacket } from 'mysql2/promise';
import { db } from '$lib/db';

export const GET: RequestHandler = async () => {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM auth_user WHERE last_active_at > NOW() - INTERVAL 1 MINUTE'
  );

  const onlineUserIds = rows.map(r => r.id);

  return new Response(JSON.stringify({ onlineUserIds }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
  });
};
