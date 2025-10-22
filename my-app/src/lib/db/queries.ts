import { db } from '$lib/db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { UserRow, ChatMessageRow, NotificationRow, MaxIdRow } from '$lib/types';

// Re-export types for backward compatibility
export type { UserRow, ChatMessageRow, NotificationRow, MaxIdRow }


// User Queries


export async function getAllUsersExcept(userId: string) {
  const [rows] = await db.execute<UserRow[]>(
    `SELECT id, name, last_active_at,
           CASE WHEN last_active_at> NOW() - INTERVAL 3 SECOND THEN 1 ELSE 0 END AS isOnline
    FROM auth_user
    WHERE id != ?`,
    [userId]
  );
  return rows;
}

export async function getUserByEmail(email: string) {
  const [rows] = await db.execute<UserRow[]>(
    'SELECT * FROM auth_user WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

export async function createUser(id: string, name: string, email: string, hashedPassword: string) {
  await db.execute(
    'INSERT INTO auth_user (id, name, email, password) VALUES (?, ?, ?, ?)',
    [id, name, email, hashedPassword]
  );
}

export async function updateUserLastActive(userId: string) {
  await db.query('UPDATE auth_user SET last_active_at= NOW() WHERE id = ?', [userId]);
}

export async function getOnlineUsers() {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM auth_user WHERE last_active_at > NOW() - INTERVAL 1 MINUTE'
  );
  return rows.map(r => r.id);
}


// Chat Message Queries


export async function getAllMessagesForUser(userId: string) {
  const [rows] = await db.execute<ChatMessageRow[]>(
    'SELECT * FROM chat WHERE sender_id=? OR receiver_id=? ORDER BY id ASC',
    [userId, userId]
  );
  return rows;
}

export async function getMessagesBetweenUsers(userId1: string, userId2: string) {
  const [rows] = await db.execute<ChatMessageRow[]>(
    'SELECT * FROM chat WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY id ASC',
    [userId1, userId2, userId2, userId1]
  );
  return rows;
}

export async function insertTextMessage(senderId: string, receiverId: string, content: string) {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO chat (sender_id, receiver_id, content, message_type, seen) VALUES (?, ?, ?, ?, 0)',
    [senderId, receiverId, content, 'text']
  );
  return result.insertId;
}

export async function insertImageMessage(
  senderId: string,
  receiverId: string,
  fileName: string,
  filePath: string
) {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO chat (sender_id, receiver_id, content, message_type, file_path, seen) VALUES (?, ?, ?, ?, ?, 0)',
    [senderId, receiverId, fileName, 'image', filePath]
  );
  return result.insertId;
}

export async function getMessageById(messageId: number) {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT * FROM chat WHERE id = ?',
    [messageId]
  );
  return rows[0] || null;
}

export async function markMessagesAsSeen(senderId: string, receiverId: string) {
  await db.execute(
    'UPDATE chat SET seen = 1 WHERE sender_id = ? AND receiver_id = ?',
    [senderId, receiverId]
  );
}

export async function markMessageAsSeenById(messageId: number, receiverId: string) {
  await db.execute(
    'UPDATE chat SET seen = 1 WHERE id = ? AND receiver_id = ?',
    [messageId, receiverId]
  );
}

export async function markAllMessagesAsSeenFromSender(senderId: string, receiverId: string) {
  await db.execute(
    'UPDATE chat SET seen = 1 WHERE sender_id = ? AND receiver_id = ?',
    [senderId, receiverId]
  );
}


// Notification Queries


export async function getUnseenMessagesWithSenders(userId: string) {
  const [rows] = await db.execute<NotificationRow[]>(
    `SELECT 
      c.sender_id,
      c.content,
      c.created_at,
      c.id,
      c.message_type,
      c.file_path,
      u.name as sender_name
    FROM chat c
    JOIN auth_user u ON c.sender_id = u.id
    WHERE c.receiver_id = ? AND c.seen = 0 
    ORDER BY c.created_at DESC`,
    [userId]
  );
  return rows;
}

// Stream Polling Queries


export async function getMaxMessageIdForUser(userId: string) {
  const [rows] = await db.execute<MaxIdRow[]>(
    'SELECT COALESCE(MAX(id), 0) AS maxId FROM chat WHERE receiver_id = ?',
    [userId]
  );
  return rows[0]?.maxId ?? 0;
}

export async function getNewMessagesForUser(userId: string, lastId: number, limit: number = 100) {
  const [rows] = await db.execute<ChatMessageRow[]>(
    'SELECT id, sender_id, receiver_id, content, message_type, file_path, created_at FROM chat WHERE receiver_id = ? AND id > ? ORDER BY id ASC LIMIT ?',
    [userId, lastId, limit]
  );
  return rows;
}
