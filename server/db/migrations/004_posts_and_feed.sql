-- Migration 004: Posts, tags, likes, comments, feed

CREATE TABLE posts (
  id         BIGSERIAL PRIMARY KEY,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  visibility post_visibility NOT NULL DEFAULT 'FRIENDS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author_id  ON posts (author_id);
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);

-- ------------------------------------------------------------

CREATE TABLE post_tags (
  post_id        BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tagged_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tagged_user_id)
);

CREATE INDEX idx_post_tags_tagged_user_id ON post_tags (tagged_user_id);

-- ------------------------------------------------------------

CREATE TABLE likes (
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_likes_user_id ON likes (user_id);

-- ------------------------------------------------------------

CREATE TABLE comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id   ON comments (post_id);
CREATE INDEX idx_comments_author_id ON comments (author_id);

-- ------------------------------------------------------------

-- Fan-out-on-write: each user's feed is pre-materialized here
CREATE TABLE feed_items (
  id       BIGSERIAL PRIMARY KEY,
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id  BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feed_items_pair_unique UNIQUE (user_id, post_id)
);

CREATE INDEX idx_feed_items_user_added ON feed_items (user_id, added_at DESC);
CREATE INDEX idx_feed_items_post_id    ON feed_items (post_id);
