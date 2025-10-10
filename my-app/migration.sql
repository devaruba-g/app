-- IMPORTANT: Run this SQL on your database before deploying to Vercel
-- This ensures the chat table has the msg_type column needed for the updated code

-- Add msg_type column if it doesn't exist
ALTER TABLE chat 
ADD COLUMN msg_type ENUM('text', 'image') DEFAULT 'text' AFTER content;

-- Add indexes for better performance on realtime queries
CREATE INDEX idx_receiver_created ON chat(receiver_id, created_at);
CREATE INDEX idx_sender_receiver ON chat(sender_id, receiver_id);

-- If you get "Duplicate column" error, the column already exists - that's fine!
-- If you get "Duplicate key" error on indexes, they already exist - that's fine too!
