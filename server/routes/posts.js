const express   = require('express');
const { z }     = require('zod');
const pool      = require('../db/pool');
const auth      = require('../middleware/auth');
const validate  = require('../middleware/validate');
const { getIo } = require('../sockets');

const router = express.Router();

const createPostSchema = z.object({
  content:         z.string().min(1).max(5000),
  visibility:      z.enum(['FRIENDS', 'FRIENDS_OF_FRIENDS', 'PUBLIC']).default('FRIENDS'),
  tagged_user_ids: z.array(z.number().int().positive()).optional(),
});

async function fanOutRecipients(client, authorId, visibility) {
  if (visibility === 'FRIENDS') {
    const { rows } = await client.query(
      `SELECT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END AS uid
       FROM friendships WHERE user_id = $1 OR friend_id = $1`,
      [authorId]
    );
    return rows.map((r) => r.uid);
  }

  // FRIENDS_OF_FRIENDS and PUBLIC: BFS depth 2, capped at 500
  const { rows } = await client.query(
    `WITH d1 AS (
       SELECT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END AS uid
       FROM friendships WHERE user_id = $1 OR friend_id = $1
     )
     SELECT DISTINCT uid FROM (
       SELECT uid FROM d1
       UNION
       SELECT CASE WHEN f.user_id = d1.uid THEN f.friend_id ELSE f.user_id END AS uid
       FROM friendships f
       JOIN d1 ON f.user_id = d1.uid OR f.friend_id = d1.uid
       WHERE CASE WHEN f.user_id = d1.uid THEN f.friend_id ELSE f.user_id END <> $1
     ) combined
     LIMIT 500`,
    [authorId]
  );
  return rows.map((r) => r.uid);
}

// POST /api/posts
router.post('/', auth, validate(createPostSchema), async (req, res) => {
  const { content, visibility, tagged_user_ids = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [post] } = await client.query(
      `INSERT INTO posts (author_id, content, visibility) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, content, visibility]
    );

    for (const uid of tagged_user_ids) {
      await client.query(
        `INSERT INTO post_tags (post_id, tagged_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [post.id, uid]
      );
    }

    const recipients = await fanOutRecipients(client, req.user.id, visibility);
    if (recipients.length) {
      const placeholders = recipients.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
      const values       = recipients.flatMap((uid) => [uid, post.id]);
      await client.query(
        `INSERT INTO feed_items (user_id, post_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        values
      );
    }

    const io = getIo();
    for (const uid of tagged_user_ids) {
      if (uid !== req.user.id) {
        const { rows: [notif] } = await client.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text) VALUES ($1, $2, 'TAG', $3) RETURNING *`,
          [uid, req.user.id, `${req.user.username} tagged you in a post.`]
        );
        if (io) io.to(`user:${uid}`).emit('notification:new', notif);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(post);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// GET /api/posts/:id
router.get('/:id', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.username, u.first_name, u.last_name,
            COUNT(DISTINCT l.user_id)::int            AS like_count,
            COUNT(DISTINCT c.id)::int                 AS comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) AS liked_by_me,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', c2.id, 'content', c2.content,
                  'author_id', c2.author_id, 'created_at', c2.created_at
                )
              ) FILTER (WHERE c2.id IS NOT NULL),
              '[]'
            ) AS comments
     FROM posts p
     JOIN users u ON u.id = p.author_id
     LEFT JOIN likes    l  ON l.post_id  = p.id
     LEFT JOIN comments c  ON c.post_id  = p.id
     LEFT JOIN comments c2 ON c2.post_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, u.id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
  res.json(rows[0]);
});

// PATCH /api/posts/:id
router.patch(
  '/:id',
  auth,
  validate(z.object({
    content:    z.string().min(1).max(5000).optional(),
    visibility: z.enum(['FRIENDS', 'FRIENDS_OF_FRIENDS', 'PUBLIC']).optional(),
  })),
  async (req, res) => {
    const { content, visibility } = req.body;
    const sets   = [];
    const values = [req.params.id, req.user.id];
    if (content)    { sets.push(`content = $${values.length + 1}`);    values.push(content); }
    if (visibility) { sets.push(`visibility = $${values.length + 1}`); values.push(visibility); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

    const { rows } = await pool.query(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = $1 AND author_id = $2 RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found or not yours' });
    res.json(rows[0]);
  }
);

// DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM posts WHERE id = $1 AND author_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Post not found or not yours' });
  res.json({ ok: true });
});

// POST /api/posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    const { rows } = await client.query(`SELECT author_id FROM posts WHERE id = $1`, [req.params.id]);
    if (rows[0] && rows[0].author_id !== req.user.id) {
      const { rows: [notif] } = await client.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text) VALUES ($1, $2, 'LIKE', $3) RETURNING *`,
        [rows[0].author_id, req.user.id, `${req.user.username} liked your post.`]
      );
      const io = getIo();
      if (io) io.to(`user:${rows[0].author_id}`).emit('notification:new', notif);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// DELETE /api/posts/:id/like
router.delete('/:id/like', auth, async (req, res) => {
  await pool.query(`DELETE FROM likes WHERE post_id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// POST /api/posts/:id/comments
router.post(
  '/:id/comments',
  auth,
  validate(z.object({ content: z.string().min(1).max(2000) })),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [req.params.id, req.user.id, req.body.content]
      );
      const { rows: postRows } = await client.query(`SELECT author_id FROM posts WHERE id = $1`, [req.params.id]);
      if (postRows[0] && postRows[0].author_id !== req.user.id) {
        const { rows: [notif] } = await client.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text) VALUES ($1, $2, 'COMMENT', $3) RETURNING *`,
          [postRows[0].author_id, req.user.id, `${req.user.username} commented on your post.`]
        );
        const io = getIo();
        if (io) io.to(`user:${postRows[0].author_id}`).emit('notification:new', notif);
      }
      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
);

// DELETE /api/posts/:id/comments/:cid
router.delete('/:id/comments/:cid', auth, async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM comments WHERE id = $1 AND post_id = $2 AND author_id = $3`,
    [req.params.cid, req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Comment not found or not yours' });
  res.json({ ok: true });
});

module.exports = router;
