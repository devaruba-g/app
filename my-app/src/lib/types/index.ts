import type { RowDataPacket } from 'mysql2/promise';

// Database Row Types

export interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  password: string;
  last_active_at?: string;
  isOnline?: number;
}

export interface ChatMessageRow extends RowDataPacket {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type?: "text" | "image";
  file_path?: string;
  created_at: string;
  seen?: number;
}

export interface NotificationRow extends RowDataPacket {
  sender_id: string;
  content: string;
  created_at: string;
  id: number;
  message_type?: "text" | "image";
  file_path?: string;
  sender_name: string;
}

export interface MaxIdRow extends RowDataPacket {
  maxId: number;
}

// Application Types

export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
}

export interface Mess {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: "text" | "image";
  file_path?: string;
  created_at: Date;
  fromSelf: boolean;
  clientTimestamp?: number;
}

export interface NotificationMessage {
  id: number;
  content: string;
  created_at: string | Date;
  message_type?: "text" | "image";
  file_path?: string;
  sender_name?: string;
}

export interface ServerMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type?: "text" | "image";
  file_path?: string;
  created_at: string | Date;
}

// Auth Types

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}
