type ChatEvent = {
  type: 'message';
  data: {
    id?: number;
    sender_id: string;
    receiver_id: string;
    content: string;
    message_type?: 'text' | 'image';
    file_path?: string;
    created_at?: string;
  };
  excludeUserId?: string; // Don't send to this user (the sender)
};

type Listener = {
  userId: string;
  callback: (event: ChatEvent) => void;
};

const listeners = new Set<Listener>();

export function subscribe(userId: string, callback: (event: ChatEvent) => void) {
  const listener: Listener = { userId, callback };
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publish(event: ChatEvent) {
  // Don't send to the sender (they already have optimistic update)
  for (const listener of listeners) {
    if (event.excludeUserId && listener.userId === event.excludeUserId) {
      continue; // Skip sending to sender
    }
    listener.callback(event);
  }
}

export function toSseChunk(event: ChatEvent): string {

  return `data: ${JSON.stringify(event.data)}\n\n`;
}


