# Social Network — Full Implementation Plan

> **How to use this file with Claude Code:**  
> Open this file in your project root. In Claude Code, reference it with `@PLAN.md` and say  
> _"implement Phase X, Step Y"_. Check off tasks as you complete them.

---

## Stack Decision

| Layer | Technology | Rationale |
|---|---|---|
| Database | PostgreSQL 16 | Required by project spec |
| Backend | Node.js 20 + Express 4 | Fast to scaffold; `pg` driver maps directly to raw SQL |
| Auth | JWT (access token) + BCrypt | Project spec mandates BCrypt |
| Real-time | Socket.IO 4 | Runs on same Express server; handles rooms for chat, presence, games |
| Frontend | React 18 + Vite + Tailwind CSS 3 | Fast HMR, small bundle |
| Validation | Zod | Runtime schema validation on every request body |
| DB client | `node-postgres` (`pg`) | Direct SQL — no ORM, keeps queries transparent |
| Hosting — DB | Supabase | Managed Postgres, free tier, connection pooling built-in |
| Hosting — API | Railway | GitHub auto-deploy, env vars, WebSocket support |
| Hosting — UI | Vercel | GitHub auto-deploy, global CDN, free personal tier |

---

## Repository Structure

```
social-network/
├── server/                  # Node.js + Express backend
│   ├── db/
│   │   ├── migrations/      # SQL files, numbered 001_enums.sql …
│   │   └── seed.sql
│   ├── middleware/
│   │   ├── auth.js          # JWT verify middleware
│   │   └── validate.js      # Zod schema middleware factory
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── friends.js
│   │   ├── posts.js
│   │   ├── feed.js
│   │   ├── chats.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   └── games.js
│   ├── sockets/
│   │   └── index.js         # Socket.IO event handlers
│   ├── app.js               # Express app (no listen)
│   └── server.js            # HTTP + Socket.IO server (listen here)
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── api/             # Axios instances + per-resource hooks
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/           # Zustand slices
│   │   └── socket.js        # Socket.IO client singleton
│   └── vite.config.js
├── .env.example
└── PLAN.md                  # ← this file
```

---

## Environment Variables

Create `.env` in `server/` (copy from `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Auth
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server
PORT=4000
CLIENT_ORIGIN=http://localhost:5173   # Vite dev server

# Environment
NODE_ENV=development
```

Create `.env.local` in `client/`:

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

---

---

# Phase 1 — Database Schema

**Goal:** PostgreSQL database fully migrated with all 16 tables, constraints, indexes, triggers, and seed data.  
**Duration:** Week 1–2  
**Output:** `server/db/migrations/` folder with numbered SQL files runnable via `psql` or Supabase SQL editor.

---

## Step 1.1 — Project bootstrap

- [ ] Create GitHub repository `social-network`
- [ ] Run `npm init -y` inside `server/`
- [ ] Install backend dependencies:
  ```bash
  npm install express pg dotenv bcrypt jsonwebtoken zod cors helmet morgan socket.io uuid
  npm install -D nodemon
  ```
- [ ] Create `server/db/pool.js`:
  ```js
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  module.exports = pool;
  ```
- [ ] Add `"dev": "nodemon server.js"` to `package.json` scripts
- [ ] Commit: `chore: initial server setup`

---

## Step 1.2 — Migration 001: Custom enum types

File: `server/db/migrations/001_enums.sql`

```sql
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE');

CREATE TYPE post_visibility AS ENUM (
  'FRIENDS',
  'FRIENDS_OF_FRIENDS',
  'PUBLIC'
);

CREATE TYPE friend_request_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE notification_type AS ENUM (
  'MESSAGE',
  'LIKE',
  'COMMENT',
  'TAG',
  'GAME',
  'FRIEND_REQUEST'
);

CREATE TYPE chat_type AS ENUM ('DM', 'GROUP');

CREATE TYPE game_invite_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE game_state AS ENUM ('CONTINUE', 'WIN', 'DRAW');
-- NOTE: LOSE is intentionally excluded; derive it in the app layer.
```

- [ ] Run in Supabase SQL editor (or `psql $DATABASE_URL -f 001_enums.sql`)
- [ ] Verify with `\dT` in psql

---

## Step 1.3 — Migration 002: Core user tables

File: `server/db/migrations/002_users_and_presence.sql`

```sql
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

CREATE UNIQUE INDEX users_username_key   ON users (username);
CREATE UNIQUE INDEX users_email_key      ON users (email);
CREATE INDEX idx_users_name             ON users (first_name, last_name);

-- -------------------------------------------------------

CREATE TABLE online_presence (
  user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------

CREATE TABLE snake_scores (
  user_id    BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  high_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT snake_scores_non_negative CHECK (high_score >= 0)
);

CREATE INDEX idx_snake_scores_high_score ON snake_scores (high_score DESC);
```

- [ ] Run migration
- [ ] Verify `\d users` shows all columns and constraints

---

## Step 1.4 — Migration 003: Friend graph

File: `server/db/migrations/003_friends.sql`

```sql
CREATE TABLE friendships (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_pair_unique  UNIQUE (user_id, friend_id),
  CONSTRAINT friendships_canonical    CHECK  (user_id < friend_id)
);

CREATE INDEX idx_friendships_user_id   ON friendships (user_id);
CREATE INDEX idx_friendships_friend_id ON friendships (friend_id);

-- -------------------------------------------------------

CREATE TABLE friend_requests (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      friend_request_status NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friend_requests_pair_unique   UNIQUE (sender_id, receiver_id),
  CONSTRAINT friend_requests_no_self       CHECK  (sender_id <> receiver_id)
);

CREATE INDEX idx_fr_receiver_pending ON friend_requests (receiver_id, status)
  WHERE status = 'PENDING';
CREATE INDEX idx_fr_sender_id ON friend_requests (sender_id);
```

- [ ] Run migration

---

## Step 1.5 — Migration 004: Posts, tags, likes, comments, feed

File: `server/db/migrations/004_posts_and_feed.sql`

```sql
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

-- -------------------------------------------------------

CREATE TABLE post_tags (
  post_id        BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tagged_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tagged_user_id)
);

CREATE INDEX idx_post_tags_tagged_user_id ON post_tags (tagged_user_id);

-- -------------------------------------------------------

CREATE TABLE likes (
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_likes_user_id ON likes (user_id);

-- -------------------------------------------------------

CREATE TABLE comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id   ON comments (post_id);
CREATE INDEX idx_comments_author_id ON comments (author_id);

-- -------------------------------------------------------

CREATE TABLE feed_items (
  id       BIGSERIAL PRIMARY KEY,
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id  BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feed_items_pair_unique UNIQUE (user_id, post_id)
);

CREATE INDEX idx_feed_items_user_added ON feed_items (user_id, added_at DESC);
CREATE INDEX idx_feed_items_post_id    ON feed_items (post_id);
```

- [ ] Run migration

---

## Step 1.6 — Migration 005: Chats and messages

File: `server/db/migrations/005_chats.sql`

```sql
CREATE TABLE chats (
  id          BIGSERIAL PRIMARY KEY,
  type        chat_type NOT NULL,
  name        VARCHAR(255),
  description TEXT,
  creator_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- DM chats must not have a name or creator
  CONSTRAINT chats_dm_no_name    CHECK (type = 'GROUP' OR (name IS NULL AND creator_id IS NULL)),
  -- GROUP chats must have a name
  CONSTRAINT chats_group_has_name CHECK (type = 'DM' OR name IS NOT NULL)
);

CREATE INDEX idx_chats_creator_id ON chats (creator_id);
CREATE INDEX idx_chats_type       ON chats (type);

-- -------------------------------------------------------

CREATE TABLE chat_members (
  chat_id   BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user_id ON chat_members (user_id);

-- -------------------------------------------------------

CREATE TABLE messages (
  id         BIGSERIAL PRIMARY KEY,
  chat_id    BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_created ON messages (chat_id, created_at ASC);
CREATE INDEX idx_messages_sender_id    ON messages (sender_id);
```

- [ ] Run migration

---

## Step 1.7 — Migration 006: Notifications

File: `server/db/migrations/006_notifications.sql`

```sql
CREATE TABLE notifications (
  id           BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- ON DELETE SET NULL so notifications survive when the triggering user deletes their account
  sender_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type         notification_type NOT NULL,
  text         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient_unread ON notifications (recipient_id, is_read, created_at DESC)
  WHERE is_read = FALSE;
CREATE INDEX idx_notif_sender_id ON notifications (sender_id);
```

- [ ] Run migration

---

## Step 1.8 — Migration 007: Games

File: `server/db/migrations/007_games.sql`

```sql
CREATE TABLE tictactoe_matches (
  id              BIGSERIAL PRIMARY KEY,
  player1_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board           CHAR(9) NOT NULL DEFAULT '---------',
  current_turn_id BIGINT NOT NULL REFERENCES users(id),
  player1_mark    CHAR(1) NOT NULL DEFAULT 'X',
  player2_mark    CHAR(1) NOT NULL DEFAULT 'O',
  state           game_state NOT NULL DEFAULT 'CONTINUE',
  winner_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  player1_score   INTEGER NOT NULL DEFAULT 0,
  player2_score   INTEGER NOT NULL DEFAULT 0,
  total_games     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ttt_different_players CHECK (player1_id <> player2_id),
  CONSTRAINT ttt_different_marks   CHECK (player1_mark <> player2_mark)
);

CREATE INDEX idx_ttt_player1_id      ON tictactoe_matches (player1_id);
CREATE INDEX idx_ttt_player2_id      ON tictactoe_matches (player2_id);
CREATE INDEX idx_ttt_current_turn_id ON tictactoe_matches (current_turn_id);
CREATE INDEX idx_ttt_winner_id       ON tictactoe_matches (winner_id);

-- -------------------------------------------------------

CREATE TABLE game_invites (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type   VARCHAR(50) NOT NULL,
  match_id    BIGINT REFERENCES tictactoe_matches(id) ON DELETE SET NULL,
  status      game_invite_status NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT game_invites_no_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_gi_receiver_pending ON game_invites (receiver_id, status)
  WHERE status = 'PENDING';
CREATE INDEX idx_gi_sender_id ON game_invites (sender_id);
CREATE INDEX idx_gi_match_id  ON game_invites (match_id);
```

- [ ] Run migration

---

## Step 1.9 — Migration 008: Triggers

File: `server/db/migrations/008_triggers.sql`

```sql
-- Generic trigger function reused by every table with updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tictactoe_matches_updated_at
  BEFORE UPDATE ON tictactoe_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] Run migration
- [ ] Test by updating a user row and confirming `updated_at` changed

---

## Step 1.10 — Seed data

File: `server/db/seed.sql`

```sql
-- 4 test users (password is "Password1!" hashed — replace hashes after running bcrypt)
INSERT INTO users (username, email, password_hash, first_name, last_name, gender) VALUES
  ('aliceuser', 'alice@example.com', '$2b$12$PLACEHOLDER1', 'Alice', 'Smith', 'FEMALE'),
  ('bobsmith1', 'bob@example.com',   '$2b$12$PLACEHOLDER2', 'Bob',   'Smith', 'MALE'),
  ('charliedoe', 'charlie@example.com', '$2b$12$PLACEHOLDER3', 'Charlie', 'Doe', 'MALE'),
  ('dianawong1', 'diana@example.com', '$2b$12$PLACEHOLDER4', 'Diana', 'Wong', 'FEMALE');

-- Friendship between Alice (1) and Bob (2)
INSERT INTO friendships (user_id, friend_id) VALUES (1, 2);

-- A public post by Alice
INSERT INTO posts (author_id, content, visibility) VALUES
  (1, 'Hello world! First post on this network.', 'PUBLIC');

-- Feed entry for Bob (friend of Alice)
INSERT INTO feed_items (user_id, post_id) VALUES (2, 1);
```

- [ ] Generate real BCrypt hashes: `node -e "const b=require('bcrypt'); b.hash('Password1!',12).then(console.log)"`
- [ ] Replace `PLACEHOLDER` hashes and run seed
- [ ] Manually verify with `SELECT * FROM users;`

---

---

# Phase 2 — Backend API

**Goal:** All REST endpoints implemented, tested with Bruno/Postman, and secured with JWT middleware.  
**Duration:** Week 3–5

---

## Step 2.1 — Express app skeleton

File: `server/app.js`

```js
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/friends',       require('./routes/friends'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/feed',          require('./routes/feed'));
app.use('/api/chats',         require('./routes/chats'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/games',         require('./routes/games'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
```

File: `server/server.js`

```js
require('dotenv').config();
const http     = require('http');
const app      = require('./app');
const { init } = require('./sockets');

const server = http.createServer(app);
init(server);                          // Socket.IO attaches here

server.listen(process.env.PORT || 4000, () =>
  console.log(`Server running on port ${process.env.PORT || 4000}`)
);
```

- [ ] `node server.js` starts without errors

---

## Step 2.2 — Auth middleware

File: `server/middleware/auth.js`

```js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

---

## Step 2.3 — Auth routes

File: `server/routes/auth.js`

Endpoints:

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, email, password, first_name, last_name, date_of_birth?, gender? }` | `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/api/auth/logout` | — (requires auth) | `{ ok: true }` |

Implementation notes:
- Register: hash password with `bcrypt.hash(password, +process.env.BCRYPT_ROUNDS)`, insert into `users`, upsert row in `online_presence`, return JWT
- Login: fetch user by email, `bcrypt.compare`, upsert `online_presence`, return JWT
- Logout: delete row from `online_presence` where `user_id = req.user.id`
- JWT payload: `{ id, username, email }`

- [ ] `POST /api/auth/register` creates user and returns token
- [ ] `POST /api/auth/login` returns token for valid credentials
- [ ] `POST /api/auth/logout` deletes presence row

---

## Step 2.4 — Users routes

File: `server/routes/users.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | ✅ | Current user's profile |
| PATCH | `/api/users/me` | ✅ | Edit profile (bio, name, gender, privacy, dob) |
| GET | `/api/users/search?q=` | ✅ | Search by first+last name using `idx_users_name` |
| GET | `/api/users/:id` | ✅ | View another user's profile (respects privacy) |
| GET | `/api/users/online` | ✅ | List online friends (joins `online_presence` + `friendships`, filters `privacy_enabled = FALSE`) |

- [ ] All 5 endpoints working
- [ ] Privacy: when `privacy_enabled = TRUE`, user is absent from online list

---

## Step 2.5 — Friends routes

File: `server/routes/friends.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/friends` | ✅ | List accepted friends |
| POST | `/api/friends/requests` | ✅ | Send friend request `{ receiver_id }` |
| GET | `/api/friends/requests/inbox` | ✅ | Pending received requests |
| PATCH | `/api/friends/requests/:id/accept` | ✅ | Accept → insert into `friendships`, update status |
| PATCH | `/api/friends/requests/:id/reject` | ✅ | Reject |
| DELETE | `/api/friends/requests/:id` | ✅ | Cancel sent request |
| DELETE | `/api/friends/:friendId` | ✅ | Unfriend (delete from `friendships`, normalise pair order with `LEAST/GREATEST`) |
| GET | `/api/friends/suggestions` | ✅ | BFS depth-2 friend-of-friend suggestions |

BFS suggestion query pattern:
```sql
-- Friends of friends who are not already my friends and not me
SELECT DISTINCT u.id, u.first_name, u.last_name, u.username
FROM friendships f1
JOIN friendships f2
  ON (f2.user_id = f1.friend_id OR f2.friend_id = f1.friend_id)
  AND f2.user_id <> $1 AND f2.friend_id <> $1
JOIN users u
  ON u.id = CASE WHEN f2.user_id = f1.friend_id THEN f2.friend_id ELSE f2.user_id END
WHERE (f1.user_id = $1 OR f1.friend_id = $1)
  AND u.id <> $1
  AND NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = LEAST($1, u.id) AND friend_id = GREATEST($1, u.id))
  )
LIMIT 20;
```

- [ ] All endpoints working
- [ ] Accept creates `friendships` row with `LEAST(a,b)` ordering
- [ ] Suggestions return users 2 hops away

---

## Step 2.6 — Posts routes

File: `server/routes/posts.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/posts` | ✅ | Create post `{ content, visibility, tagged_user_ids? }` |
| GET | `/api/posts/:id` | ✅ | Single post with like count + comments |
| PATCH | `/api/posts/:id` | ✅ | Edit post (author only) |
| DELETE | `/api/posts/:id` | ✅ | Delete post (author only) |
| POST | `/api/posts/:id/like` | ✅ | Like a post |
| DELETE | `/api/posts/:id/like` | ✅ | Unlike |
| POST | `/api/posts/:id/comments` | ✅ | Add comment |
| DELETE | `/api/posts/:id/comments/:cid` | ✅ | Delete comment (author only) |

**Fan-out logic on create** (run in a transaction):
1. Insert into `posts`
2. Insert `post_tags` rows for each tagged user
3. Collect recipient user IDs based on `visibility`:
   - `FRIENDS` → BFS depth 1 (direct friends)
   - `FRIENDS_OF_FRIENDS` → BFS depth 2 (cap at 500 rows for safety)
   - `PUBLIC` → BFS depth 2 (same cap — expand later if needed)
4. Bulk insert into `feed_items (user_id, post_id)`
5. Insert `TAG` notifications for tagged users

- [ ] Create with tags fans out to correct recipients
- [ ] Like/unlike toggles correctly (upsert / delete)
- [ ] Comment triggers `COMMENT` notification to post author

---

## Step 2.7 — Feed route

File: `server/routes/feed.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/feed?cursor=&limit=20` | ✅ | Paginated feed (keyset pagination on `added_at`) |

Query pattern:
```sql
SELECT p.*, u.username, u.first_name, u.last_name,
       COUNT(DISTINCT l.user_id) AS like_count,
       COUNT(DISTINCT c.id)      AS comment_count,
       EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS liked_by_me
FROM feed_items fi
JOIN posts   p ON p.id = fi.post_id
JOIN users   u ON u.id = p.author_id
LEFT JOIN likes    l ON l.post_id = p.id
LEFT JOIN comments c ON c.post_id = p.id
WHERE fi.user_id = $1
  AND ($2::timestamptz IS NULL OR fi.added_at < $2)
GROUP BY p.id, u.id, fi.added_at
ORDER BY fi.added_at DESC
LIMIT $3;
```

- [ ] Returns 20 posts per page
- [ ] `cursor` param enables infinite scroll

---

## Step 2.8 — Chat routes

File: `server/routes/chats.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/chats` | ✅ | All chats for current user (inbox) |
| POST | `/api/chats/dm` | ✅ | Start or find existing DM `{ user_id }` |
| POST | `/api/chats/group` | ✅ | Create group `{ name, description, member_ids }` |
| GET | `/api/chats/:id` | ✅ | Chat metadata + members |
| PATCH | `/api/chats/:id` | ✅ | Edit group name/description (creator only) |
| POST | `/api/chats/:id/members` | ✅ | Add member to group |
| DELETE | `/api/chats/:id/members/:uid` | ✅ | Remove member from group |

DM find-or-create pattern:
```sql
SELECT c.id FROM chats c
JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
WHERE c.type = 'DM';
```

- [ ] DM deduplication works (second request returns existing chat id)
- [ ] Only chat members can access a chat (middleware check)

---

## Step 2.9 — Messages route

File: `server/routes/messages.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/:chatId?before=&limit=50` | ✅ | Paginated message history |
| POST | `/api/messages/:chatId` | ✅ | Send message (also emits Socket.IO event) |

- [ ] Sending emits `chat:message` to Socket.IO room `chat:{chatId}`
- [ ] Triggers `MESSAGE` notification for each chat member except sender

---

## Step 2.10 — Notifications route

File: `server/routes/notifications.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications?unread_only=true` | ✅ | List notifications |
| PATCH | `/api/notifications/:id/read` | ✅ | Mark one as read |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all as read |

- [ ] Unread count returned in list response header `X-Unread-Count`

---

## Step 2.11 — Games routes

File: `server/routes/games.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/games/invites` | ✅ | Send TicTacToe invite `{ receiver_id }` |
| PATCH | `/api/games/invites/:id/accept` | ✅ | Accept → create `tictactoe_matches` row |
| PATCH | `/api/games/invites/:id/reject` | ✅ | Reject invite |
| GET | `/api/games/matches/:id` | ✅ | Get match state |
| POST | `/api/games/matches/:id/move` | ✅ | Make a move `{ position: 0-8 }` |
| POST | `/api/games/snake/score` | ✅ | Upsert Snake high score `{ score }` |
| GET | `/api/games/snake/leaderboard` | ✅ | Top 10 Snake scores |

Move logic:
1. Validate it is `req.user.id`'s turn
2. Validate the board cell is empty (`board[position] === '-'`)
3. Write the mark into the board string
4. Check for win (8 winning combos) or draw (no `-` left)
5. Update `state`, `winner_id`, scores, `total_games` if game ended
6. Flip `current_turn_id` to the other player
7. Emit `game:move` to Socket.IO room `match:{matchId}`

- [ ] Invalid moves are rejected with 400
- [ ] Win detection works for all 8 combinations
- [ ] Score upsert uses `INSERT ... ON CONFLICT (user_id) DO UPDATE SET high_score = GREATEST(...)`

---

---

# Phase 3 — Frontend

**Goal:** All screens built in React, communicating with the API, no real-time yet (polling where needed).  
**Duration:** Week 6–8

---

## Step 3.1 — Vite + React + Tailwind bootstrap

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install axios zustand react-router-dom socket.io-client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js` to scan `./src/**/*.{js,jsx}`.

- [ ] `npm run dev` serves at `localhost:5173`
- [ ] Tailwind utility classes work in a test component

---

## Step 3.2 — API client + auth store

File: `client/src/api/client.js` — Axios instance with base URL + JWT interceptor  
File: `client/src/store/authStore.js` — Zustand store: `{ user, token, login(), logout() }`

- [ ] Token persisted in `localStorage` and attached to every request
- [ ] 401 response triggers auto-logout

---

## Step 3.3 — Routing

Use React Router v6. Protected wrapper redirects to `/login` if no token.

```
/login          AuthPage (login tab)
/register       AuthPage (register tab)
/               Feed (protected)
/profile/:id    ProfilePage (protected)
/friends        FriendsPage (protected)
/chats          ChatInboxPage (protected)
/chats/:id      ChatThreadPage (protected)
/notifications  NotificationsPage (protected)
/games          GamesLobbyPage (protected)
/games/ttt/:id  TicTacToePage (protected)
/games/snake    SnakePage (protected)
```

- [ ] Unauthenticated users redirected to `/login`
- [ ] Browser back/forward works correctly

---

## Step 3.4 — Auth screens

`/login` and `/register` pages:
- [ ] Register form: username, email, password, first name, last name, dob, gender
- [ ] Login form: email, password
- [ ] Inline field-level validation (username 8–12 chars, password strength)
- [ ] On success: store token → redirect to `/`

---

## Step 3.5 — Feed page

- [ ] Infinite scroll (Intersection Observer triggers next page load via `cursor`)
- [ ] Compose post box at top: textarea + visibility dropdown + tag users input
- [ ] Each post card: author avatar/name, timestamp, content, like button (with count), comment count, comment collapse/expand
- [ ] Optimistic like toggle (update local state immediately, sync on response)

---

## Step 3.6 — Profile page

- [ ] View own profile at `/profile/me` or `/profile/:id`
- [ ] Own profile: edit mode (bio, gender, privacy toggle)
- [ ] Other profile: show friend status + send/cancel/accept request button
- [ ] List of that user's posts

---

## Step 3.7 — Friends page

- [ ] Three tabs: Friends list | Pending requests (badge count) | Suggestions
- [ ] Friends list: name, unfriend button
- [ ] Pending requests: accept / reject buttons
- [ ] Suggestions: "Add friend" button per card

---

## Step 3.8 — Chat pages

`/chats` — Inbox:
- [ ] List of DMs and groups, sorted by most recent message
- [ ] "New DM" button: user search → open or create DM
- [ ] "New group" button: modal with name + member multi-select

`/chats/:id` — Thread:
- [ ] Messages list (oldest at top, newest at bottom)
- [ ] Auto-scroll to bottom on load and new message
- [ ] Message input + send
- [ ] Group info panel: member list, add/remove members (creator only)
- [ ] Poll for new messages every 3 seconds (replace with Socket.IO in Phase 4)

---

## Step 3.9 — Notifications page

- [ ] List of all notifications with type icon, text, timestamp
- [ ] "Mark all read" button
- [ ] Bell icon in navbar with unread badge (poll count every 30s)

---

## Step 3.10 — Games pages

`/games` — Lobby:
- [ ] Pending invites list with accept / reject
- [ ] "Invite to TicTacToe" — user search → send invite
- [ ] Snake high score + "Play Snake" button

`/games/ttt/:id` — Match:
- [ ] 3×3 grid rendered from `board` string
- [ ] Highlight winning cells
- [ ] "Your turn" / "Waiting…" indicator
- [ ] Scoreboard (player1\_score / player2\_score / total\_games)
- [ ] "New game" resets board but keeps session scores

`/games/snake` — Snake:
- [ ] Canvas-based single-player Snake (self-contained)
- [ ] On game over: `POST /api/games/snake/score` if score > current high score
- [ ] Display personal best + global leaderboard

---

---

# Phase 4 — Real-time & Security

**Goal:** Live chat, notifications, TicTacToe moves, and online presence via Socket.IO. Production-grade security.  
**Duration:** Week 9–10

---

## Step 4.1 — Socket.IO server setup

File: `server/sockets/index.js`

```js
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const pool       = require('../db/pool');

function init(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN, credentials: true }
  });

  // Auth middleware — verify JWT on every connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Upsert online_presence
    await pool.query(
      `INSERT INTO online_presence (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()`,
      [userId]
    );

    // Join all of this user's chat rooms
    const { rows } = await pool.query(
      `SELECT chat_id FROM chat_members WHERE user_id = $1`, [userId]
    );
    rows.forEach(r => socket.join(`chat:${r.chat_id}`));

    // Join active TicTacToe match rooms
    const { rows: matches } = await pool.query(
      `SELECT id FROM tictactoe_matches
       WHERE (player1_id = $1 OR player2_id = $1) AND state = 'CONTINUE'`,
      [userId]
    );
    matches.forEach(m => socket.join(`match:${m.id}`));

    socket.on('chat:join', (chatId) => socket.join(`chat:${chatId}`));

    socket.on('disconnect', async () => {
      await pool.query(`DELETE FROM online_presence WHERE user_id = $1`, [userId]);
    });
  });

  return io;
}

module.exports = { init };
```

Export `io` so routes can emit events.

- [ ] Socket connects after login with token in handshake auth
- [ ] Disconnect removes `online_presence` row

---

## Step 4.2 — Emit from routes

In `messages.js` send route, after inserting the message:
```js
io.to(`chat:${chatId}`).emit('chat:message', messageRow);
```

In `games.js` move route, after updating match:
```js
io.to(`match:${matchId}`).emit('game:move', matchRow);
```

In notification helper function:
```js
io.to(`user:${recipientId}`).emit('notification:new', notificationRow);
```

- [ ] Sending a message emits to all members in real time
- [ ] Making a TicTacToe move updates opponent's board immediately

---

## Step 4.3 — Socket.IO client

File: `client/src/socket.js`
```js
import { io } from 'socket.io-client';
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: localStorage.getItem('token') },
  autoConnect: false,
});
export default socket;
```

- Connect on login, disconnect on logout
- In `ChatThreadPage`: listen for `chat:message` → append to messages list
- In `TicTacToePage`: listen for `game:move` → update board state
- In `Navbar`: listen for `notification:new` → increment unread badge

- [ ] Remove 3-second polling from chat (replaced by Socket.IO)
- [ ] Notification badge increments in real time

---

## Step 4.4 — Security hardening

Install rate limiter:
```bash
npm install express-rate-limit
```

Add to `app.js`:
```js
const rateLimit = require('express-rate-limit');
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/',     rateLimit({ windowMs: 1  * 60 * 1000, max: 200 }));
```

Checklist:
- [ ] Helmet sets security headers (already added in Step 2.1)
- [ ] Rate limiter on auth routes (20 req / 15 min)
- [ ] Global rate limiter (200 req / min per IP)
- [ ] All request bodies validated with Zod schemas before hitting DB
- [ ] SQL queries use parameterized placeholders — no string interpolation anywhere
- [ ] CORS restricted to `CLIENT_ORIGIN` env var
- [ ] JWT secret is ≥ 32 random characters in production

---

---

# Phase 5 — Hosting & Deployment

**Goal:** App running on public URLs, auto-deploys on `git push main`.  
**Duration:** Week 11–12

---

## Step 5.1 — Supabase (PostgreSQL)

1. Create account at [supabase.com](https://supabase.com)
2. New project → choose region closest to users
3. Go to **SQL Editor** → run all 8 migration files in order
4. Go to **Settings → Database** → copy the **Connection string (URI)**
5. Set `DATABASE_URL` in Railway (Step 5.2)

- [ ] All tables visible in Supabase Table Editor
- [ ] Connection from local server using Supabase URL works

---

## Step 5.2 — Railway (Backend)

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo → select `social-network`
3. Set **Root Directory** to `server`
4. Set **Start Command** to `node server.js`
5. Add environment variables:
   ```
   DATABASE_URL=<supabase connection string>
   JWT_SECRET=<long random string — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   JWT_EXPIRES_IN=7d
   BCRYPT_ROUNDS=12
   CLIENT_ORIGIN=<your Vercel URL — add after Step 5.3>
   NODE_ENV=production
   PORT=4000
   ```
6. Railway assigns a public URL like `https://social-network-api.up.railway.app`

- [ ] `GET https://<railway-url>/api/auth` returns 404 (route not found = server running)
- [ ] GitHub push to `main` triggers automatic redeploy

---

## Step 5.3 — Vercel (Frontend)

1. Create account at [vercel.com](https://vercel.com)
2. New Project → Import from GitHub → select `social-network`
3. Set **Root Directory** to `client`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. Add environment variables:
   ```
   VITE_API_URL=https://<your-railway-url>
   VITE_SOCKET_URL=https://<your-railway-url>
   ```
8. Deploy → Vercel assigns `https://social-network.vercel.app`
9. Go back to Railway → update `CLIENT_ORIGIN` to the Vercel URL → redeploy

- [ ] Login works end-to-end on the public Vercel URL
- [ ] No CORS errors in browser console
- [ ] GitHub push to `main` triggers Vercel rebuild

---

## Step 5.4 — Final production checklist

- [ ] `NODE_ENV=production` set on Railway
- [ ] No `console.log` with sensitive data in production paths
- [ ] Database URL uses SSL (`?sslmode=require` — Supabase requires this)
- [ ] JWT secret is not the placeholder string
- [ ] Supabase Row Level Security (RLS) — optionally enable if using Supabase client directly; not needed if all DB access is through your Express server
- [ ] Test register → login → post → like → comment → DM → TicTacToe on the live URL
- [ ] Share the Vercel URL for grading

---

---

# Quick Reference: Key SQL Patterns

```sql
-- Normalise friendship pair (always lower id first)
WHERE user_id = LEAST($1, $2) AND friend_id = GREATEST($1, $2)

-- Upsert online presence
INSERT INTO online_presence (user_id) VALUES ($1)
ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW();

-- Upsert snake high score (never decrease)
INSERT INTO snake_scores (user_id, high_score)
VALUES ($1, $2)
ON CONFLICT (user_id)
DO UPDATE SET high_score = GREATEST(snake_scores.high_score, EXCLUDED.high_score),
              updated_at = NOW();

-- Find or create DM chat
SELECT c.id FROM chats c
JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
WHERE c.type = 'DM';

-- Paginated feed (keyset)
WHERE fi.user_id = $1 AND ($2::timestamptz IS NULL OR fi.added_at < $2)
ORDER BY fi.added_at DESC LIMIT 20;
```

---

# Estimated Timeline

| Week | Phase | Milestone |
|---|---|---|
| 1 | Phase 1 | All 8 migrations applied, seed data in |
| 2 | Phase 1 | Triggers tested, seed queries verified |
| 3 | Phase 2 | Auth + Users + Friends routes done |
| 4 | Phase 2 | Posts + Feed + Chats + Messages routes done |
| 5 | Phase 2 | Notifications + Games routes done, Postman collection complete |
| 6 | Phase 3 | Auth screens + Feed page |
| 7 | Phase 3 | Profile + Friends + Chat UI |
| 8 | Phase 3 | Notifications + Games UI (TicTacToe + Snake) |
| 9 | Phase 4 | Socket.IO live chat + TicTacToe |
| 10 | Phase 4 | Online presence + notification push + security hardening |
| 11 | Phase 5 | Supabase + Railway + Vercel deployed |
| 12 | Phase 5 | End-to-end testing on live URLs, submission |
