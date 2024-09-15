-- schema.sql
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(255) PRIMARY KEY,
  playlist_count INTEGER NOT NULL DEFAULT 0,
  is_subscribed BOOLEAN NOT NULL DEFAULT FALSE
);
