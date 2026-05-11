-- Migration 001: Custom enum types
-- Run once before any table migrations

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

-- LOSE is intentionally excluded; derive it in the app layer
CREATE TYPE game_state AS ENUM ('CONTINUE', 'WIN', 'DRAW');
