const express  = require('express');
const { z }    = require('zod');
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { getIo } = require('../sockets');

const router = express.Router();

async function assertMember(chatId, userId, res) {
  const { rows } = await pool.query(
    `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );
  if (!rows.length) { res.status(403).json({ error: 'Not a member' }); return false; }
  return true;
}

// GET /api/messages/:chatId?before=<timestamp>&limit=50
router.get('/:chatId', auth, async (req, res) => {
  if (!(await assertMember(req.params.chatId, req.user.id, res))) return;

  const before = req.query.before || null;
  const limit  = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const { rows } = await pool.query(
    `SELECT m.*, u.username, u.first_name, u.last_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
       AND ($2::timestamptz IS NULL OR m.created_at < $2)
     ORDER BY m.created_at DESC
     LIMIT $3`,
    [req.params.chatId, before, limit]
  );
  res.json(rows.reverse());
});

// POST /api/messages/:chatId
router.post(
  '/:chatId',
  auth,
  validate(z.object({ content: z.string().min(1).max(5000) })),
  async (req, res) => {
    if (!(await assertMember(req.params.chatId, req.user.id, res))) return;

    const { rows: [msg] } = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.chatId, req.user.id, req.body.content]
    );

    const { rows: members } = await pool.query(
      `SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id <> $2`,
      [req.params.chatId, req.user.id]
    );
    const io = getIo();
    for (const { user_id } of members) {
      const { rows: [notif] } = await pool.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text) VALUES ($1, $2, 'MESSAGE', $3) RETURNING *`,
        [user_id, req.user.id, `${req.user.username} sent you a message.`]
      );
      if (io) io.to(`user:${user_id}`).emit('notification:new', notif);
    }

    if (io) io.to(`chat:${req.params.chatId}`).emit('chat:message', msg);

    res.status(201).json(msg);
  }
);

module.exports = router;
