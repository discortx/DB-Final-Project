-- Seed data — all passwords are "Password1!" hashed with BCrypt rounds=12
-- Run AFTER all 8 migrations

-- Test users
INSERT INTO users (username, email, password_hash, first_name, last_name, gender) VALUES
  ('aliceuser', 'alice@example.com', '$2b$12$SSOoRX6TNlHsR6NjWyDbq.2HhvXNXO65bAjX.ATVzSeKIKFFctRda', 'Alice',   'Smith',   'FEMALE'),
  ('bobsmith1', 'bob@example.com',   '$2b$12$JwP/46.S4eEo36jk.n2Q8..BD84ywOng0fzPIF4gR264FOQb/p532',  'Bob',     'Smith',   'MALE'),
  ('charliedoe', 'charlie@example.com','$2b$12$Kl/QytAyj52QRBGgJtP84O0uLEm2PgaltVk6yERq5ssC7ZKvxa4Pa','Charlie', 'Doe',     'MALE'),
  ('dianawong1', 'diana@example.com', '$2b$12$L4rAQl7VMGeJW1HRCYQLhesupk.l2OuudqHiwKcEqoU3gK90J7L0a', 'Diana',   'Wong',    'FEMALE');

-- Snake score rows (required for upsert to work on first game)
INSERT INTO snake_scores (user_id, high_score) VALUES (1, 0), (2, 0), (3, 0), (4, 0);

-- Friendship: Alice (1) <-> Bob (2) — canonical order: lower id first
INSERT INTO friendships (user_id, friend_id) VALUES (1, 2);

-- Friendship: Bob (2) <-> Charlie (3)
INSERT INTO friendships (user_id, friend_id) VALUES (2, 3);

-- A public post by Alice
INSERT INTO posts (author_id, content, visibility) VALUES
  (1, 'Hello world! First post on this network.', 'PUBLIC');

-- Feed entries: both Bob (friend) and Charlie (friend-of-friend) see Alice's public post
INSERT INTO feed_items (user_id, post_id) VALUES (2, 1);
INSERT INTO feed_items (user_id, post_id) VALUES (3, 1);

-- A pending friend request: Diana -> Alice
INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (4, 1, 'PENDING');

-- A GAME notification for Alice (from seed, so there's something to test)
INSERT INTO notifications (recipient_id, sender_id, type, text) VALUES
  (1, 2, 'FRIEND_REQUEST', 'Bob Smith sent you a friend request.'),
  (2, 1, 'LIKE', 'Alice Smith liked your post.');
