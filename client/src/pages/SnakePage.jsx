import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { upsertSnakeScore, getSnakeLeaderboard } from '../api/games';
import useAuthStore from '../store/authStore';
import Avatar from '../components/ui/Avatar';

// ─── Game constants ──────────────────────────────────────────────────────────
const CELL_SIZE = 20;
const COLS = 20;
const ROWS = 20;
const CANVAS_W = COLS * CELL_SIZE;
const CANVAS_H = ROWS * CELL_SIZE;
const INITIAL_INTERVAL = 150;
const SPEED_UP_EVERY = 5;
const SPEED_UP_AMOUNT = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randomCell(snake) {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
function LeaderboardTable({ entries, currentUserId }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'rgba(245,240,239,0.45)' }}>
        Play Snake to appear on the leaderboard!
      </p>
    );
  }

  const rankColor = (rank) =>
    rank === 1 ? '#F5C542'
    : rank === 2 ? 'rgba(245,240,239,0.75)'
    : rank === 3 ? 'rgba(245,240,239,0.55)'
    : 'rgba(245,240,239,0.4)';

  return (
    <div className="w-full">
      <div className="grid grid-cols-[32px_1fr_64px_64px] gap-2 px-3 py-2">
        {['#', 'Player', 'Score', 'Date'].map((h, i) => (
          <span
            key={h}
            className={`text-[10px] uppercase tracking-widest font-semibold${i >= 2 ? ' text-right' : ''}`}
            style={{ color: 'rgba(245,240,239,0.4)' }}
          >
            {h}
          </span>
        ))}
      </div>
      <div>
        {entries.map((entry) => {
          const isMe = String(entry.user_id) === String(currentUserId);
          return (
            <div
              key={entry.user_id ?? entry.id}
              className="grid grid-cols-[32px_1fr_64px_64px] gap-2 items-center px-3 py-2.5"
              style={
                isMe
                  ? { background: 'rgba(139,21,32,0.12)', borderLeft: '2px solid #8B1520', borderBottom: '1px solid rgba(255,255,255,0.06)' }
                  : { borderBottom: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              <span className="font-bold text-sm" style={{ color: rankColor(entry.rank) }}>
                {entry.rank}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar size="sm" firstName={entry.first_name || ''} lastName={entry.last_name || ''} />
                <span className="text-sm truncate font-medium" style={{ color: '#F5F0EF' }}>
                  {entry.first_name} {entry.last_name}
                </span>
              </div>
              <span className="font-bold text-sm text-right" style={{ color: '#F5F0EF' }}>
                {entry.high_score}
              </span>
              <span className="text-xs text-right" style={{ color: 'rgba(245,240,239,0.45)' }}>
                {entry.updated_at
                  ? new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loading leaderboard skeleton ────────────────────────────────────────────
const SNAKE_CSS = `
  @keyframes skeletonShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
  .skeleton-pulse {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function SnakePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canvasRef = useRef(null);

  const snakeRef = useRef([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 5, y: 5 });
  const scoreRef = useRef(0);
  const statusRef = useRef('idle');
  const intervalRef = useRef(null);
  const speedLevelRef = useRef(0);
  const isNewHighScoreRef = useRef(false);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle');
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snake = snakeRef.current;
    const food = foodRef.current;
    const status = statusRef.current;
    const currentScore = scoreRef.current;

    // Background — dark
    ctx.fillStyle = '#0A0809';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines (very faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_W; x += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Food (amber/yellow square)
    ctx.fillStyle = '#F5C542';
    const fr = 3;
    const fx = food.x * CELL_SIZE + 2;
    const fy = food.y * CELL_SIZE + 2;
    const fs = CELL_SIZE - 4;
    ctx.beginPath();
    ctx.moveTo(fx + fr, fy);
    ctx.lineTo(fx + fs - fr, fy);
    ctx.quadraticCurveTo(fx + fs, fy, fx + fs, fy + fr);
    ctx.lineTo(fx + fs, fy + fs - fr);
    ctx.quadraticCurveTo(fx + fs, fy + fs, fx + fs - fr, fy + fs);
    ctx.lineTo(fx + fr, fy + fs);
    ctx.quadraticCurveTo(fx, fy + fs, fx, fy + fs - fr);
    ctx.lineTo(fx, fy + fr);
    ctx.quadraticCurveTo(fx, fy, fx + fr, fy);
    ctx.closePath();
    ctx.fill();

    // Snake segments — crimson
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#8B1520' : i < 3 ? 'rgba(139,21,32,0.85)' : 'rgba(139,21,32,0.65)';
      const r = isHead ? 5 : 3;
      const sx = seg.x * CELL_SIZE + 1;
      const sy = seg.y * CELL_SIZE + 1;
      const sw = CELL_SIZE - 2;
      const sh = CELL_SIZE - 2;
      ctx.beginPath();
      ctx.moveTo(sx + r, sy);
      ctx.lineTo(sx + sw - r, sy);
      ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + r);
      ctx.lineTo(sx + sw, sy + sh - r);
      ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - r, sy + sh);
      ctx.lineTo(sx + r, sy + sh);
      ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - r);
      ctx.lineTo(sx, sy + r);
      ctx.quadraticCurveTo(sx, sy, sx + r, sy);
      ctx.closePath();
      ctx.fill();
    });

    // Overlays
    if (status === 'idle') {
      ctx.fillStyle = 'rgba(10,8,9,0.72)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#F5F0EF';
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SNAKE', CANVAS_W / 2, CANVAS_H / 2 - 24);
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(245,240,239,0.6)';
      ctx.fillText('Press Space to start', CANVAS_W / 2, CANVAS_H / 2 + 16);
    } else if (status === 'paused') {
      ctx.fillStyle = 'rgba(10,8,9,0.5)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#F5F0EF';
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2);
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(245,240,239,0.6)';
      ctx.fillText('Press Space to resume', CANVAS_W / 2, CANVAS_H / 2 + 36);
    } else if (status === 'gameover') {
      ctx.fillStyle = 'rgba(10,8,9,0.82)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#F5F0EF';
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 40);
      ctx.font = '18px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(245,240,239,0.85)';
      ctx.fillText(`Score: ${currentScore}`, CANVAS_W / 2, CANVAS_H / 2);
      if (isNewHighScoreRef.current) {
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#F5C542';
        ctx.fillText('NEW HIGH SCORE!', CANVAS_W / 2, CANVAS_H / 2 + 34);
      }
    }
  }, []);

  const initGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    speedLevelRef.current = 0;
    isNewHighScoreRef.current = false;
    foodRef.current = randomCell(snakeRef.current);
    setScore(0);
    setIsNewHighScore(false);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const gameStep = useCallback(() => {
    const snake = snakeRef.current;
    dirRef.current = nextDirRef.current;
    const dir = dirRef.current;
    const head = snake[0];
    const nx = (head.x + dir.x + COLS) % COLS;
    const ny = (head.y + dir.y + ROWS) % ROWS;

    if (snake.some((s) => s.x === nx && s.y === ny)) {
      stopInterval();
      statusRef.current = 'gameover';
      setGameStatus('gameover');
      const finalScore = scoreRef.current;
      setScore(finalScore);
      setHighScore((prev) => {
        if (finalScore > prev) {
          isNewHighScoreRef.current = true;
          setIsNewHighScore(true);
          upsertSnakeScore(finalScore)
            .then(() => getSnakeLeaderboard())
            .then((r) => setLeaderboard(r.data || []))
            .catch(() => {});
          draw();
          return finalScore;
        }
        draw();
        return prev;
      });
      return;
    }

    const newHead = { x: nx, y: ny };
    const ateFood = nx === foodRef.current.x && ny === foodRef.current.y;
    let newSnake;
    if (ateFood) {
      newSnake = [newHead, ...snake];
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      foodRef.current = randomCell(newSnake);
      if (newScore % SPEED_UP_EVERY === 0) {
        speedLevelRef.current += 1;
        const newLevel = speedLevelRef.current;
        stopInterval();
        const newInterval = Math.max(60, INITIAL_INTERVAL - newLevel * SPEED_UP_AMOUNT);
        intervalRef.current = setInterval(gameStep, newInterval);
      }
    } else {
      newSnake = [newHead, ...snake.slice(0, -1)];
    }
    snakeRef.current = newSnake;
    draw();
  }, [draw, stopInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = useCallback(() => {
    stopInterval();
    initGame();
    statusRef.current = 'playing';
    setGameStatus('playing');
    intervalRef.current = setInterval(gameStep, INITIAL_INTERVAL);
    draw();
  }, [stopInterval, initGame, gameStep, draw]);

  const pauseGame = useCallback(() => {
    stopInterval();
    statusRef.current = 'paused';
    setGameStatus('paused');
    draw();
  }, [stopInterval, draw]);

  const resumeGame = useCallback(() => {
    statusRef.current = 'playing';
    setGameStatus('playing');
    const currentLevel = speedLevelRef.current;
    const interval = Math.max(60, INITIAL_INTERVAL - currentLevel * SPEED_UP_AMOUNT);
    intervalRef.current = setInterval(gameStep, interval);
    draw();
  }, [gameStep, draw]);

  useEffect(() => {
    const handler = (e) => {
      const key = e.key;
      const status = statusRef.current;
      const currentDir = dirRef.current;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        if (currentDir.y !== 1) nextDirRef.current = { x: 0, y: -1 };
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        if (currentDir.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault();
        if (currentDir.x !== 1) nextDirRef.current = { x: -1, y: 0 };
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault();
        if (currentDir.x !== -1) nextDirRef.current = { x: 1, y: 0 };
      } else if (key === ' ' || key === 'p' || key === 'P') {
        e.preventDefault();
        if (status === 'idle' || status === 'gameover') startGame();
        else if (status === 'playing') pauseGame();
        else if (status === 'paused') resumeGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [startGame, pauseGame, resumeGame]);

  const handleDpad = useCallback((dirKey) => {
    const currentDir = dirRef.current;
    if (dirKey === 'up' && currentDir.y !== 1) nextDirRef.current = { x: 0, y: -1 };
    else if (dirKey === 'down' && currentDir.y !== -1) nextDirRef.current = { x: 0, y: 1 };
    else if (dirKey === 'left' && currentDir.x !== 1) nextDirRef.current = { x: -1, y: 0 };
    else if (dirKey === 'right' && currentDir.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    if (statusRef.current === 'idle' || statusRef.current === 'gameover') startGame();
  }, [startGame]);

  useEffect(() => {
    setLoadingLeaderboard(true);
    getSnakeLeaderboard()
      .then((r) => {
        const data = r.data || [];
        setLeaderboard(data);
        if (user) {
          const me = data.find((e) => String(e.user_id) === String(user.id));
          if (me) setHighScore(me.high_score);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLeaderboard(false));
    draw();
    return () => stopInterval();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dpadBtnStyle = {
    width: 48, height: 48,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'rgba(245,240,239,0.75)',
    touchAction: 'none',
  };

  return (
    <>
      <style>{SNAKE_CSS}</style>
      <div className="max-w-[540px] mx-auto pt-8 pb-12 px-4 text-center">
        {/* Back link */}
        <div className="flex items-center justify-start mb-2">
          <Link
            to="/games"
            className="inline-flex items-center gap-1 text-sm transition-colors hover:text-white/70"
            style={{ color: 'rgba(245,240,239,0.4)' }}
          >
            <ChevronLeft size={16} />
            Back to Games
          </Link>
        </div>

        <h2
          className="mb-1"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 700,
            fontSize: '1.65rem',
            color: '#F5F0EF',
          }}
        >
          Snake
        </h2>
        <p className="text-sm mb-4" style={{ color: 'rgba(245,240,239,0.45)' }}>
          Use arrow keys or WASD to move. Space to pause.
        </p>

        {/* Score display */}
        <div className="flex items-center justify-center gap-8 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(245,240,239,0.45)' }}>
              SCORE
            </p>
            <p className="text-4xl font-black leading-none mt-1" style={{ color: '#F5F0EF' }}>
              {score}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(245,240,239,0.45)' }}>
              BEST
            </p>
            <p className="text-sm font-semibold leading-none mt-1" style={{ color: 'rgba(245,240,239,0.55)' }}>
              {highScore > 0 ? highScore : '—'}
            </p>
          </div>
        </div>

        {/* Canvas wrapper */}
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              imageRendering: 'pixelated',
            }}
          />

          {/* React overlay for game over buttons */}
          {gameStatus === 'gameover' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-10 gap-3 pointer-events-none">
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #A8192B 0%, #8B1520 100%)',
                    color: '#F5F0EF', border: '1px solid rgba(196,30,51,0.4)',
                    borderRadius: 8, padding: '8px 24px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(139,21,32,0.3)',
                  }}
                  onClick={startGame}
                >
                  Play Again
                </button>
                <button
                  type="button"
                  style={{
                    background: 'none', color: 'rgba(245,240,239,0.75)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '6px 16px', fontSize: '0.875rem',
                    fontWeight: 500, cursor: 'pointer',
                  }}
                  onClick={() => navigate('/games')}
                >
                  Back to Games
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile D-pad */}
        <div className="flex flex-col items-center gap-1 mt-4 md:hidden">
          <button
            type="button"
            style={dpadBtnStyle}
            onTouchStart={(e) => { e.preventDefault(); handleDpad('up'); }}
            onClick={() => handleDpad('up')}
          >
            <ArrowUp size={18} />
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              style={dpadBtnStyle}
              onTouchStart={(e) => { e.preventDefault(); handleDpad('left'); }}
              onClick={() => handleDpad('left')}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              style={dpadBtnStyle}
              onTouchStart={(e) => { e.preventDefault(); handleDpad('down'); }}
              onClick={() => handleDpad('down')}
            >
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              style={dpadBtnStyle}
              onTouchStart={(e) => { e.preventDefault(); handleDpad('right'); }}
              onClick={() => handleDpad('right')}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Leaderboard preview */}
        <div className="mt-10 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(245,240,239,0.45)' }}>
            GLOBAL LEADERBOARD
          </p>
          {loadingLeaderboard ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="skeleton-pulse w-8 h-4 rounded" />
                  <div className="skeleton-pulse w-6 h-6 rounded-full shrink-0" />
                  <div className="skeleton-pulse h-3 w-28 rounded" />
                  <div className="skeleton-pulse h-3 w-10 ml-auto rounded" />
                  <div className="skeleton-pulse h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <LeaderboardTable entries={leaderboard.slice(0, 5)} currentUserId={user?.id} />
          )}
        </div>
      </div>
    </>
  );
}
