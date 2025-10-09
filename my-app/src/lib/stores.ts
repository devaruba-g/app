import { writable, derived } from 'svelte/store';

let myId = '';

export interface Mess {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: Date;
  seen: boolean;
  fromSelf: boolean;
}

export const currentChatUser = writable<string | null>(null);

export const messagesStore = writable<Mess[]>([]);

export const unseenMessages = derived(
  [messagesStore, currentChatUser],
  ([$messages, $currentChatUser]) =>
    $messages.filter(
      m => !m.seen && m.receiver_id === myId && m.sender_id !== $currentChatUser
    )
);

export function setCurrentUser(id: string) {
  myId = id;
}
