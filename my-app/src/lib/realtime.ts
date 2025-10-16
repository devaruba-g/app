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
};

type Listener = (event: ChatEvent) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publish(event: ChatEvent) {
  for (const listener of listeners) listener(event);
}

export function toSseChunk(event: ChatEvent): string {

  return `data: ${JSON.stringify(event.data)}\n\n`;
}


