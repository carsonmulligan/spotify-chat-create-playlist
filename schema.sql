-- schema.sql
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  playlist_count INTEGER NOT NULL DEFAULT 0,
  is_subscribed BOOLEAN NOT NULL DEFAULT FALSE
);
