-- Migration 003: Friend graph

-- Canonical pair: user_id < friend_id enforced by CHECK constraint
-- so every friendship is stored exactly once
CREATE TABLE friendships (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_pair_unique UNIQUE (user_id, friend_id),
  CONSTRAINT friendships_canonical   CHECK  (user_id < friend_id)
);

CREATE INDEX idx_friendships_user_id   ON friendships (user_id);
CREATE INDEX idx_friendships_friend_id ON friendships (friend_id);

-- ------------------------------------------------------------

CREATE TABLE friend_requests (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      friend_request_status NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friend_requests_pair_unique UNIQUE (sender_id, receiver_id),
  CONSTRAINT friend_requests_no_self     CHECK  (sender_id <> receiver_id)
);

CREATE INDEX idx_fr_receiver_pending ON friend_requests (receiver_id, status)
  WHERE status = 'PENDING';
CREATE INDEX idx_fr_sender_id ON friend_requests (sender_id);
