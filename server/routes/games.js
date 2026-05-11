const express  = require('express');
const { z }    = require('zod');
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getIo } = require('../sockets');

const router = express.Router();

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWin(board, mark) {
  return WINS.some((combo) => combo.every((i) => board[i] === mark));
}

// GET /api/games/invites/pending
router.get('/invites/pending', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM game_invites WHERE receiver_id = $1 AND status = 'PENDING' ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/games/invites
router.post(
  '/invites',
  auth,
  validate(z.object({ receiver_id: z.number().int().positive() })),
  async (req, res) => {
    if (req.body.receiver_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }
    const { rows } = await pool.query(
      `INSERT INTO game_invites (sender_id, receiver_id, game_type) VALUES ($1, $2, 'tictactoe') RETURNING *`,
      [req.user.id, req.body.receiver_id]
    );
    await pool.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text) VALUES ($1, $2, 'GAME', $3)`,
      [req.body.receiver_id, req.user.id, `${req.user.username} invited you to play TicTacToe.`]
    );
    res.status(201).json(rows[0]);
  }
);

// PATCH /api/games/invites/:id/accept
router.patch('/invites/:id/accept', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [invite] } = await client.query(
      `UPDATE game_invites SET status = 'ACCEPTED'
       WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!invite) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invite not found' });
    }

    const { rows: [match] } = await client.query(
      `INSERT INTO tictactoe_matches (player1_id, player2_id, current_turn_id)
       VALUES ($1, $2, $1) RETURNING *`,
      [invite.sender_id, invite.receiver_id]
    );
    await client.query(`UPDATE game_invites SET match_id = $1 WHERE id = $2`, [match.id, invite.id]);

    await client.query('COMMIT');
    res.json(match);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// PATCH /api/games/invites/:id/reject
router.patch('/invites/:id/reject', auth, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE game_invites SET status = 'REJECTED'
     WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
     RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Invite not found' });
  res.json(rows[0]);
});

// GET /api/games/matches/:id
router.get('/matches/:id', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM tictactoe_matches WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Match not found' });
  if (rows[0].player1_id !== req.user.id && rows[0].player2_id !== req.user.id) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  res.json(rows[0]);
});

// POST /api/games/matches/:id/move
router.post(
  '/matches/:id/move',
  auth,
  validate(z.object({ position: z.number().int().min(0).max(8) })),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [match] } = await client.query(
        `SELECT * FROM tictactoe_matches WHERE id = $1 FOR UPDATE`,
        [req.params.id]
      );
      if (!match) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Match not found' });
      }
      if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Not a participant' });
      }
      if (match.state !== 'CONTINUE') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Game already ended' });
      }
      if (match.current_turn_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Not your turn' });
      }

      const { position } = req.body;
      const board = match.board.split('');
      if (board[position] !== '-') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cell already taken' });
      }

      const myMark  = match.player1_id === req.user.id ? match.player1_mark : match.player2_mark;
      board[position] = myMark;
      const newBoard  = board.join('');

      let state    = 'CONTINUE';
      let winnerId = null;
      let p1Score  = match.player1_score;
      let p2Score  = match.player2_score;
      let total    = match.total_games;

      if (checkWin(newBoard, myMark)) {
        state    = 'WIN';
        winnerId = req.user.id;
        if (req.user.id === match.player1_id) p1Score++; else p2Score++;
        total++;
      } else if (!newBoard.includes('-')) {
        state = 'DRAW';
        total++;
      }

      const otherId = match.player1_id === req.user.id ? match.player2_id : match.player1_id;

      const { rows: [updated] } = await client.query(
        `UPDATE tictactoe_matches SET
           board           = $2,
           state           = $3,
           winner_id       = $4,
           player1_score   = $5,
           player2_score   = $6,
           total_games     = $7,
           current_turn_id = CASE WHEN $3 = 'CONTINUE' THEN $8 ELSE current_turn_id END
         WHERE id = $1 RETURNING *`,
        [match.id, newBoard, state, winnerId, p1Score, p2Score, total, otherId]
      );

      await client.query('COMMIT');

      const io = getIo();
      if (io) io.to(`match:${match.id}`).emit('game:move', updated);

      res.json(updated);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
);

// POST /api/games/matches/:id/rematch
router.post('/matches/:id/rematch', auth, async (req, res) => {
  const { rows: [match] } = await pool.query(`SELECT * FROM tictactoe_matches WHERE id = $1`, [req.params.id]);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  if (match.state === 'CONTINUE') return res.status(400).json({ error: 'Game still in progress' });

  const nextTurn = match.current_turn_id === match.player1_id ? match.player2_id : match.player1_id;
  const { rows: [updated] } = await pool.query(
    `UPDATE tictactoe_matches
     SET board = '---------', state = 'CONTINUE', winner_id = NULL, current_turn_id = $2
     WHERE id = $1 RETURNING *`,
    [match.id, nextTurn]
  );

  const io = getIo();
  if (io) io.to(`match:${match.id}`).emit('game:move', updated);

  res.json(updated);
});

// POST /api/games/snake/score
router.post(
  '/snake/score',
  auth,
  validate(z.object({ score: z.number().int().nonnegative() })),
  async (req, res) => {
    const { rows } = await pool.query(
      `INSERT INTO snake_scores (user_id, high_score) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET high_score = GREATEST(snake_scores.high_score, EXCLUDED.high_score),
             updated_at = NOW()
       RETURNING *`,
      [req.user.id, req.body.score]
    );
    res.json(rows[0]);
  }
);

// GET /api/games/snake/leaderboard
router.get('/snake/leaderboard', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.first_name, u.last_name,
            ss.high_score, ss.updated_at,
            RANK() OVER (ORDER BY ss.high_score DESC)::int AS rank
     FROM snake_scores ss
     JOIN users u ON u.id = ss.user_id
     WHERE ss.high_score > 0
     ORDER BY ss.high_score DESC
     LIMIT 10`
  );
  res.json(rows);
});

module.exports = router;
