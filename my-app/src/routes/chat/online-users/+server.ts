import type { RequestHandler } from '@sveltejs/kit';
import { getOnlineUsers } from '$lib/db/queries';

// Get list of online users

export const GET: RequestHandler = async () => {
  const onlineUserIds = await getOnlineUsers();

  return new Response(JSON.stringify({ onlineUserIds }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
  });
};
