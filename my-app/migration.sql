-- Run this SQL if your chat table doesn't have msg_type column
-- This ensures compatibility with the updated code

ALTER TABLE chat 
ADD COLUMN IF NOT EXISTS msg_type ENUM('text', 'image') DEFAULT 'text' AFTER content;

-- Add index for better performance on realtime queries
CREATE INDEX IF NOT EXISTS idx_receiver_created 
ON chat(receiver_id, created_at);

-- Add index for message loading queries
CREATE INDEX IF NOT EXISTS idx_sender_receiver 
ON chat(sender_id, receiver_id);
