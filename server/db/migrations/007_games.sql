-- Migration 007: Games (TicTacToe matches + game invites)

CREATE TABLE tictactoe_matches (
  id              BIGSERIAL PRIMARY KEY,
  player1_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 9-character string: each char is 'X', 'O', or '-' (empty)
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

-- ------------------------------------------------------------

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
