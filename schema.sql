-- schema.sql
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  playlist_count INTEGER NOT NULL DEFAULT 0,
  is_subscribed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire);
