const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const pool       = require('../db/pool');

let _io = null;

function init(httpServer) {
  _io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || '*', credentials: true },
  });

  _io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  _io.on('connection', async (socket) => {
    const userId = socket.user.id;

    socket.join(`user:${userId}`);

    await pool.query(
      `INSERT INTO online_presence (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()`,
      [userId]
    );

    const { rows: chatRows } = await pool.query(
      `SELECT chat_id FROM chat_members WHERE user_id = $1`,
      [userId]
    );
    chatRows.forEach((r) => socket.join(`chat:${r.chat_id}`));

    const { rows: matchRows } = await pool.query(
      `SELECT id FROM tictactoe_matches
       WHERE (player1_id = $1 OR player2_id = $1) AND state = 'CONTINUE'`,
      [userId]
    );
    matchRows.forEach((m) => socket.join(`match:${m.id}`));

    socket.on('chat:join', (chatId) => socket.join(`chat:${chatId}`));

    socket.on('chat:typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('chat:typing', { userId, chatId, typing: true });
    });
    socket.on('chat:typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('chat:typing', { userId, chatId, typing: false });
    });

    socket.on('disconnect', async () => {
      await pool.query(`DELETE FROM online_presence WHERE user_id = $1`, [userId]);
    });
  });

  return _io;
}

function getIo() {
  return _io;
}

module.exports = { init, getIo };
