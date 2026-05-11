-- Migration 002: Core user tables

CREATE TABLE users (
  id               BIGSERIAL PRIMARY KEY,
  username         VARCHAR(12)  NOT NULL UNIQUE,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(60)  NOT NULL,
  first_name       VARCHAR(100) NOT NULL,
  last_name        VARCHAR(100) NOT NULL,
  date_of_birth    DATE,
  bio              TEXT,
  gender           gender_type,
  privacy_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_length CHECK (LENGTH(username) BETWEEN 8 AND 12)
);

-- users_username_key and users_email_key are created automatically by the UNIQUE constraints above
CREATE INDEX idx_users_name ON users (first_name, last_name);

-- ------------------------------------------------------------

CREATE TABLE online_presence (
  user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------

CREATE TABLE snake_scores (
  user_id    BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  high_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT snake_scores_non_negative CHECK (high_score >= 0)
);

CREATE INDEX idx_snake_scores_high_score ON snake_scores (high_score DESC);
