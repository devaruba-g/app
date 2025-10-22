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
  excludeUserId?: string; 
};

type Listener = {
  userId: string;
  callback: (event: ChatEvent) => void;
};

const listeners = new Set<Listener>();

// Subscribe to chat events

export function subscribe(userId: string, callback: (event: ChatEvent) => void) {
  const listener: Listener = { userId, callback };
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publish(event: ChatEvent) {
  for (const listener of listeners) {
    if (event.excludeUserId && listener.userId === event.excludeUserId) {
      continue; 
    }
    listener.callback(event);
  }
}

export function toSseChunk(event: ChatEvent): string {

  return `data: ${JSON.stringify(event.data)}\n\n`;
}


