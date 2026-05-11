const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const registerSchema = z.object({
  username:      z.string().min(8).max(12),
  email:         z.string().email(),
  password:      z.string().min(8),
  first_name:    z.string().min(1).max(100),
  last_name:     z.string().min(1).max(100),
  date_of_birth: z.string().optional().nullable(),
  gender:        z.enum(['MALE', 'FEMALE']).optional().nullable(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, email, password, first_name, last_name, date_of_birth, gender } = req.body;

  const hash = await bcrypt.hash(password, +(process.env.BCRYPT_ROUNDS || 12));

  let user;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, date_of_birth, gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, first_name, last_name, created_at`,
      [username, email, hash, first_name, last_name, date_of_birth || null, gender || null]
    );
    user = rows[0];
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    throw err;
  }

  await pool.query(
    `INSERT INTO online_presence (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()`,
    [user.id]
  );

  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    `SELECT id, username, email, password_hash, first_name, last_name FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await pool.query(
    `INSERT INTO online_presence (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()`,
    [user.id]
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token: signToken(user), user: safeUser });
});

router.post('/logout', auth, async (req, res) => {
  await pool.query(`DELETE FROM online_presence WHERE user_id = $1`, [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
