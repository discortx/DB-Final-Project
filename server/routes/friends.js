const express  = require('express');
const { z }    = require('zod');
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/friends
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.first_name, u.last_name, f.created_at AS friends_since
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
     WHERE f.user_id = $1 OR f.friend_id = $1
     ORDER BY u.first_name, u.last_name`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/friends/requests/inbox  — declared before /:friendId
router.get('/requests/inbox', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT fr.id, fr.sender_id, fr.created_at, u.username, u.first_name, u.last_name
     FROM friend_requests fr
     JOIN users u ON u.id = fr.sender_id
     WHERE fr.receiver_id = $1 AND fr.status = 'PENDING'
     ORDER BY fr.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/friends/suggestions
router.get('/suggestions', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name, u.username
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
         WHERE user_id = LEAST($1::bigint, u.id) AND friend_id = GREATEST($1::bigint, u.id)
       )
     LIMIT 20`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/friends/requests
router.post(
  '/requests',
  auth,
  validate(z.object({ receiver_id: z.number().int().positive() })),
  async (req, res) => {
    const { receiver_id } = req.body;
    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot send a request to yourself' });
    }

    const { rows: alreadyFriends } = await pool.query(
      `SELECT 1 FROM friendships
       WHERE user_id = LEAST($1::bigint,$2::bigint) AND friend_id = GREATEST($1::bigint,$2::bigint)`,
      [req.user.id, receiver_id]
    );
    if (alreadyFriends.length) return res.status(409).json({ error: 'Already friends' });

    const { rows } = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT (sender_id, receiver_id) DO NOTHING
       RETURNING *`,
      [req.user.id, receiver_id]
    );

    if (rows[0]) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text)
         VALUES ($1, $2, 'FRIEND_REQUEST', $3)`,
        [receiver_id, req.user.id, `${req.user.username} sent you a friend request.`]
      );
    }

    res.status(201).json(rows[0] || { message: 'Request already sent' });
  }
);

// PATCH /api/friends/requests/:id/accept
router.patch('/requests/:id/accept', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE friend_requests SET status = 'ACCEPTED'
       WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const { sender_id, receiver_id } = rows[0];
    await client.query(
      `INSERT INTO friendships (user_id, friend_id)
       VALUES (LEAST($1::bigint,$2::bigint), GREATEST($1::bigint,$2::bigint))`,
      [sender_id, receiver_id]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// PATCH /api/friends/requests/:id/reject
router.patch('/requests/:id/reject', auth, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE friend_requests SET status = 'REJECTED'
     WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
     RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
  res.json(rows[0]);
});

// DELETE /api/friends/requests/:id  (cancel sent request)
router.delete('/requests/:id', auth, async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM friend_requests
     WHERE id = $1 AND sender_id = $2 AND status = 'PENDING'`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Request not found' });
  res.json({ ok: true });
});

// DELETE /api/friends/:friendId  (unfriend)
router.delete('/:friendId', auth, async (req, res) => {
  const friendId = parseInt(req.params.friendId, 10);
  const { rowCount } = await pool.query(
    `DELETE FROM friendships
     WHERE user_id = LEAST($1::bigint,$2::bigint) AND friend_id = GREATEST($1::bigint,$2::bigint)`,
    [req.user.id, friendId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Friendship not found' });
  res.json({ ok: true });
});

module.exports = router;
