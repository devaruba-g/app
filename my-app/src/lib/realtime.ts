import { db } from './db';
import type { RowDataPacket } from 'mysql2/promise';

export type ChatEvent = {
  type: 'message';
  data: {
    id?: number;
    sender_id: string;
    receiver_id: string;
    content: string;
    image_url: string | null;
    msg_type: 'text' | 'image';
    created_at?: string;
  };
};

interface RealtimeMessage extends RowDataPacket {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  seen: boolean;
  msg_type?: 'text' | 'image';
}

type Listener = (event: ChatEvent) => void;

export function subscribe(listener: Listener) {
  return () => {};
}

export function publish(event: ChatEvent) {

}

export function toSseChunk(event: ChatEvent): string {
  return `data: ${JSON.stringify(event.data)}\n\n`;
}

export async function pollNewMessages(userId: string, since: Date): Promise<ChatEvent[]> {
  try {
    const mysqlTime = since.toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await db.execute<RealtimeMessage[]>(
      `SELECT * FROM chat 
       WHERE receiver_id = ? 
       AND created_at > ? 
       ORDER BY created_at ASC`,
      [userId, mysqlTime]
    );
    
    return rows.map(row => ({
      type: 'message' as const,
      data: {
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        content: row.content,
        image_url: null,
        msg_type: (row.msg_type || 'text') as 'text' | 'image',
        created_at: row.created_at
      }
    }));
  } catch (err) {
    console.error('Poll error:', err);
    return [];
  }
}



