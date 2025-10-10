# Vercel Deployment Guide - Reactive Messages Fix

## Problem Fixed
Messages are now reactive on Vercel using database polling instead of in-memory pub/sub.

## Steps to Deploy

### 1. Run Database Migration
**CRITICAL:** Run the SQL in `migration.sql` on your MySQL database before deploying.

```bash
# Connect to your Railway MySQL database and run:
mysql -h interchange.proxy.rlwy.net -P 36698 -u root -p railway < migration.sql
```

Or manually execute the SQL:
```sql
ALTER TABLE chat ADD COLUMN msg_type ENUM('text', 'image') DEFAULT 'text' AFTER content;
CREATE INDEX idx_receiver_created ON chat(receiver_id, created_at);
CREATE INDEX idx_sender_receiver ON chat(sender_id, receiver_id);
```

### 2. Environment Variables on Vercel
Make sure these are set in your Vercel project settings:
- `DATABASE_URL` - Your MySQL connection string

### 3. Deploy to Vercel
```bash
npm run build
# Then push to your Git repo connected to Vercel
# Or use: vercel --prod
```

## How It Works Now

### Local (Localhost)
- SSE endpoint polls database every 2 seconds
- Messages appear within 2 seconds max
- Also has 1-second interval polling as fallback

### Vercel (Production)
- Same behavior - database polling via SSE
- Works across serverless instances
- No in-memory state needed
- 60-second function timeout configured

## Testing Reactivity

1. Open two browser windows
2. Login as different users
3. Send a message from User A
4. User B should see it within 2 seconds (via SSE)
5. Check browser DevTools Network tab - you should see:
   - `chat/stream` connection active (EventStream)
   - Messages flowing through SSE

## Troubleshooting

### "Failed to send message: undefined"
- Run the migration.sql - `msg_type` column is missing

### Messages not appearing
- Check Vercel function logs for errors
- Verify DATABASE_URL is set correctly
- Check browser console for SSE connection errors

### SSE connection drops
- Normal on Vercel after 60 seconds
- Browser will auto-reconnect (retry: 3000ms)
- Messages still work via polling fallback

## Performance Notes
- Database is polled every 2 seconds per connected user
- Indexes added for optimal query performance
- Consider upgrading to Redis pub/sub if you have 100+ concurrent users
