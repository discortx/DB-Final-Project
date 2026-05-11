const express  = require('express');
const { z }    = require('zod');
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const patchMeSchema = z.object({
  first_name:      z.string().min(1).max(100).optional(),
  last_name:       z.string().min(1).max(100).optional(),
  bio:             z.string().max(500).nullable().optional(),
  gender:          z.enum(['MALE', 'FEMALE']).nullable().optional(),
  date_of_birth:   z.string().nullable().optional(),
  privacy_enabled: z.boolean().optional(),
});

const SAFE_COLS = 'id, username, email, first_name, last_name, date_of_birth, bio, gender, privacy_enabled, created_at';

// Must be declared before /:id to avoid shadowing
router.get('/online', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.first_name, u.last_name, op.last_seen_at
     FROM online_presence op
     JOIN users u ON u.id = op.user_id
     JOIN friendships f
       ON f.user_id = LEAST($1::bigint, u.id) AND f.friend_id = GREATEST($1::bigint, u.id)
     WHERE u.id <> $1 AND u.privacy_enabled = FALSE`,
    [req.user.id]
  );
  res.json(rows);
});

router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${SAFE_COLS} FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json(rows[0]);
});

router.patch('/me', auth, validate(patchMeSchema), async (req, res) => {
  const allowed = ['first_name', 'last_name', 'bio', 'gender', 'date_of_birth', 'privacy_enabled'];
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'No valid fields provided' });

  const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values     = [req.user.id, ...updates.map(([, v]) => v)];

  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses} WHERE id = $1 RETURNING ${SAFE_COLS}`,
    values
  );
  res.json(rows[0]);
});

router.get('/search', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const { rows } = await pool.query(
    `SELECT id, username, first_name, last_name
     FROM users
     WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR (first_name || ' ' || last_name) ILIKE $1)
       AND id <> $2
     ORDER BY first_name, last_name
     LIMIT 20`,
    [`%${q}%`, req.user.id]
  );
  res.json(rows);
});

router.get('/:id', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, first_name, last_name, bio, gender, privacy_enabled, created_at
     FROM users WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

module.exports = router;
