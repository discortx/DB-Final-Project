-- Migration 005: Chats and messages

CREATE TABLE chats (
  id          BIGSERIAL PRIMARY KEY,
  type        chat_type NOT NULL,
  name        VARCHAR(255),
  description TEXT,
  creator_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- DM chats must not have a name or creator
  CONSTRAINT chats_dm_no_name     CHECK (type = 'GROUP' OR (name IS NULL AND creator_id IS NULL)),
  -- GROUP chats must have a name
  CONSTRAINT chats_group_has_name CHECK (type = 'DM'    OR name IS NOT NULL)
);

CREATE INDEX idx_chats_creator_id ON chats (creator_id);
CREATE INDEX idx_chats_type       ON chats (type);

-- ------------------------------------------------------------

CREATE TABLE chat_members (
  chat_id   BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user_id ON chat_members (user_id);

-- ------------------------------------------------------------

CREATE TABLE messages (
  id         BIGSERIAL PRIMARY KEY,
  chat_id    BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_created ON messages (chat_id, created_at ASC);
CREATE INDEX idx_messages_sender_id    ON messages (sender_id);
