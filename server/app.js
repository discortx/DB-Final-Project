require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1); // Railway / Vercel sit behind a reverse proxy
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/',     rateLimit({ windowMs: 60 * 1000,       max: 200, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/friends',       require('./routes/friends'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/feed',          require('./routes/feed'));
app.use('/api/chats',         require('./routes/chats'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/games',         require('./routes/games'));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
