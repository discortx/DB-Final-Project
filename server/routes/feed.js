const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');

const router = express.Router();

// GET /api/feed?cursor=<timestamptz>&limit=20
router.get('/', auth, async (req, res) => {
  const cursor = req.query.cursor || null;
  const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  const { rows } = await pool.query(
    `SELECT p.id, p.content, p.visibility, p.created_at, p.updated_at, fi.added_at,
            u.id AS author_id, u.username, u.first_name, u.last_name,
            COUNT(DISTINCT l.user_id)::int AS like_count,
            COUNT(DISTINCT c.id)::int      AS comment_count,
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
     LIMIT $3`,
    [req.user.id, cursor, limit]
  );

  const nextCursor = rows.length === limit ? rows[rows.length - 1].added_at : null;
  res.json({ items: rows, nextCursor });
});

module.exports = router;
