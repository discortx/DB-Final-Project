const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications?unread_only=true
router.get('/', auth, async (req, res) => {
  const unreadOnly = req.query.unread_only === 'true';

  const { rows } = await pool.query(
    `SELECT n.*,
            u.username       AS sender_username,
            u.first_name     AS sender_first_name,
            u.last_name      AS sender_last_name
     FROM notifications n
     LEFT JOIN users u ON u.id = n.sender_id
     WHERE n.recipient_id = $1
       ${unreadOnly ? 'AND n.is_read = FALSE' : ''}
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
    [req.user.id]
  );

  res.setHeader('X-Unread-Count', count);
  res.json(rows);
});

// PATCH /api/notifications/read-all  — must be before /:id/read
router.patch('/read-all', auth, async (req, res) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1 AND is_read = FALSE`,
    [req.user.id]
  );
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND recipient_id = $2
     RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
  res.json(rows[0]);
});

module.exports = router;
