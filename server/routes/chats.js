const express  = require('express');
const { z }    = require('zod');
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

async function isMember(chatId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );
  return rows.length > 0;
}

// GET /api/chats
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.type, c.name, c.description, c.created_at,
            (SELECT m.content    FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
            ou.id         AS other_user_id,
            ou.first_name AS other_first_name,
            ou.last_name  AS other_last_name,
            ou.username   AS other_username
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
     LEFT JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id <> $1 AND c.type = 'DM'
     LEFT JOIN users ou ON ou.id = cm2.user_id
     ORDER BY last_message_at DESC NULLS LAST`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/chats/dm
router.post('/dm', auth, validate(z.object({ user_id: z.coerce.number().int().positive() })), async (req, res) => {
  const otherId = req.body.user_id;

  const { rows: existing } = await pool.query(
    `SELECT c.id FROM chats c
     JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
     JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
     WHERE c.type = 'DM'`,
    [req.user.id, otherId]
  );
  if (existing[0]) return res.json(existing[0]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [chat] } = await client.query(`INSERT INTO chats (type) VALUES ('DM') RETURNING *`);
    await client.query(
      `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [chat.id, req.user.id, otherId]
    );
    await client.query('COMMIT');
    res.status(201).json(chat);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// POST /api/chats/group
router.post(
  '/group',
  auth,
  validate(z.object({
    name:        z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    member_ids:  z.array(z.coerce.number().int().positive()).min(1),
  })),
  async (req, res) => {
    const { name, description, member_ids } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [chat] } = await client.query(
        `INSERT INTO chats (type, name, description, creator_id) VALUES ('GROUP', $1, $2, $3) RETURNING *`,
        [name, description || null, req.user.id]
      );
      const allMembers  = [...new Set([req.user.id, ...member_ids])];
      const placeholders = allMembers.map((_, i) => `($1, $${i + 2})`).join(',');
      await client.query(
        `INSERT INTO chat_members (chat_id, user_id) VALUES ${placeholders}`,
        [chat.id, ...allMembers]
      );
      await client.query('COMMIT');
      res.status(201).json(chat);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[POST /chats/group] error:', e);
      res.status(500).json({ error: e?.message || 'Failed to create group chat' });
    } finally {
      client.release();
    }
  }
);

// GET /api/chats/:id
router.get('/:id', auth, async (req, res) => {
  if (!(await isMember(req.params.id, req.user.id))) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const { rows: [chat] } = await pool.query(`SELECT * FROM chats WHERE id = $1`, [req.params.id]);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const { rows: members } = await pool.query(
    `SELECT u.id, u.username, u.first_name, u.last_name, cm.joined_at
     FROM chat_members cm JOIN users u ON u.id = cm.user_id
     WHERE cm.chat_id = $1`,
    [req.params.id]
  );
  res.json({ ...chat, members });
});

// PATCH /api/chats/:id
router.patch(
  '/:id',
  auth,
  validate(z.object({
    name:        z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
  })),
  async (req, res) => {
    const { rows: [chat] } = await pool.query(`SELECT * FROM chats WHERE id = $1`, [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.creator_id !== req.user.id) return res.status(403).json({ error: 'Only the creator can edit' });

    const { rows } = await pool.query(
      `UPDATE chats
       SET name = COALESCE($2, name), description = COALESCE($3, description)
       WHERE id = $1 RETURNING *`,
      [req.params.id, req.body.name, req.body.description]
    );
    res.json(rows[0]);
  }
);

// POST /api/chats/:id/members
router.post(
  '/:id/members',
  auth,
  validate(z.object({ user_id: z.number().int().positive() })),
  async (req, res) => {
    if (!(await isMember(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'Not a member' });
    }
    await pool.query(
      `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.body.user_id]
    );
    res.json({ ok: true });
  }
);

// DELETE /api/chats/:id/members/:uid
router.delete('/:id/members/:uid', auth, async (req, res) => {
  const { rows: [chat] } = await pool.query(`SELECT creator_id FROM chats WHERE id = $1`, [req.params.id]);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const targetId = parseInt(req.params.uid, 10);
  const isCreator = chat.creator_id === req.user.id;
  const isSelf    = targetId === req.user.id;
  if (!isCreator && !isSelf) return res.status(403).json({ error: 'Only the creator can remove others' });

  await pool.query(`DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2`, [req.params.id, targetId]);
  res.json({ ok: true });
});

module.exports = router;
