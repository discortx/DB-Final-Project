import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { upsertSnakeScore, getSnakeLeaderboard } from '../api/games';
import useAuthStore from '../store/authStore';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import { SkeletonAvatar } from '../components/ui/Skeleton';

// ─── Game constants ──────────────────────────────────────────────────────────
const CELL_SIZE = 20;
const COLS = 20;
const ROWS = 20;
const CANVAS_W = COLS * CELL_SIZE; // 400
const CANVAS_H = ROWS * CELL_SIZE; // 400
const INITIAL_INTERVAL = 150;
const SPEED_UP_EVERY = 5; // every 5 food, speed up
const SPEED_UP_AMOUNT = 5; // ms reduction per level

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

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
function LeaderboardTable({ entries, currentUserId }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-[#888888] text-center py-6">
        Play Snake to appear on the leaderboard!
      </p>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-[32px_1fr_64px_64px] gap-2 px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold">#</span>
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold">Player</span>
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold text-right">Score</span>
        <span className="text-[10px] uppercase tracking-widest text-[#888888] font-semibold text-right">Date</span>
      </div>
      <div className="divide-y divide-[#E0E0E0]">
        {entries.map((entry) => {
          const isMe = String(entry.user_id) === String(currentUserId);
          const rankColor =
            entry.rank === 1 ? 'text-[#0A0A0A]'
            : entry.rank === 2 ? 'text-[#404040]'
            : entry.rank === 3 ? 'text-[#888888]'
            : 'text-[#888888]';
          return (
            <div
              key={entry.user_id ?? entry.id}
              className={`grid grid-cols-[32px_1fr_64px_64px] gap-2 items-center px-3 py-2.5 ${
                isMe ? 'bg-[#F7F7F7] rounded-lg border-l-2 border-black' : ''
              }`}
            >
              <span className={`font-bold text-sm ${rankColor}`}>{entry.rank}</span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar size="sm" firstName={entry.first_name || ''} lastName={entry.last_name || ''} />
                <span className="text-sm text-[#0A0A0A] truncate font-medium">
                  {entry.first_name} {entry.last_name}
                </span>
              </div>
              <span className="font-bold text-sm text-right text-[#0A0A0A]">{entry.high_score}</span>
              <span className="text-xs text-[#888888] text-right">
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function SnakePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canvasRef = useRef(null);

  // ── Game state in refs (no re-renders for game loop) ──
  const snakeRef = useRef([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 }); // buffer for input
  const foodRef = useRef({ x: 5, y: 5 });
  const scoreRef = useRef(0);
  const statusRef = useRef('idle'); // 'idle' | 'playing' | 'paused' | 'gameover'
  const intervalRef = useRef(null);
  const speedLevelRef = useRef(0);
  const isNewHighScoreRef = useRef(false);

  // ── React state for display only ──
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle');
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // ── Draw function (reads from refs) ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snake = snakeRef.current;
    const food = foodRef.current;
    const status = statusRef.current;
    const currentScore = scoreRef.current;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines (very light)
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_W; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    // Food (red square with slight rounding)
    ctx.fillStyle = '#CC0000';
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

    // Snake segments
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#0A0A0A' : i < 3 ? '#222222' : '#404040';
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
      ctx.fillStyle = 'rgba(0,0,0,0.60)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SNAKE', CANVAS_W / 2, CANVAS_H / 2 - 24);
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('Press Space to start', CANVAS_W / 2, CANVAS_H / 2 + 16);
    } else if (status === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2);
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.fillText('Press Space to resume', CANVAS_W / 2, CANVAS_H / 2 + 36);
    } else if (status === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 40);
      ctx.font = '18px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`Score: ${currentScore}`, CANVAS_W / 2, CANVAS_H / 2);
      if (isNewHighScoreRef.current) {
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#F59E0B';
        ctx.fillText('NEW HIGH SCORE!', CANVAS_W / 2, CANVAS_H / 2 + 34);
      }
    }
  }, []);

  // ── Init game state ──
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

  // ── Stop interval ──
  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Game step (called on interval) ──
  const gameStep = useCallback(() => {
    const snake = snakeRef.current;
    // Commit buffered direction
    dirRef.current = nextDirRef.current;
    const dir = dirRef.current;

    const head = snake[0];
    const nx = (head.x + dir.x + COLS) % COLS;
    const ny = (head.y + dir.y + ROWS) % ROWS;

    // Check self collision
    if (snake.some((s) => s.x === nx && s.y === ny)) {
      // Game over
      stopInterval();
      statusRef.current = 'gameover';
      setGameStatus('gameover');

      const finalScore = scoreRef.current;
      setScore(finalScore);

      setHighScore((prev) => {
        if (finalScore > prev) {
          isNewHighScoreRef.current = true;
          setIsNewHighScore(true);
          // Submit to server
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

      // Place new food
      foodRef.current = randomCell(newSnake);

      // Speed up every SPEED_UP_EVERY food
      if (newScore % SPEED_UP_EVERY === 0) {
        speedLevelRef.current += 1;
        const newLevel = speedLevelRef.current;
        stopInterval();
        const newInterval = Math.max(
          60,
          INITIAL_INTERVAL - newLevel * SPEED_UP_AMOUNT
        );
        intervalRef.current = setInterval(gameStep, newInterval);
      }
    } else {
      newSnake = [newHead, ...snake.slice(0, -1)];
    }

    snakeRef.current = newSnake;
    draw();
  }, [draw, stopInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start game ──
  const startGame = useCallback(() => {
    stopInterval();
    initGame();
    statusRef.current = 'playing';
    setGameStatus('playing');
    intervalRef.current = setInterval(gameStep, INITIAL_INTERVAL);
    draw();
  }, [stopInterval, initGame, gameStep, draw]);

  // ── Pause ──
  const pauseGame = useCallback(() => {
    stopInterval();
    statusRef.current = 'paused';
    setGameStatus('paused');
    draw();
  }, [stopInterval, draw]);

  // ── Resume ──
  const resumeGame = useCallback(() => {
    statusRef.current = 'playing';
    setGameStatus('playing');
    const currentLevel = speedLevelRef.current;
    const interval = Math.max(60, INITIAL_INTERVAL - currentLevel * SPEED_UP_AMOUNT);
    intervalRef.current = setInterval(gameStep, interval);
    draw();
  }, [gameStep, draw]);

  // ── Keyboard handler ──
  useEffect(() => {
    const handler = (e) => {
      const key = e.key;
      const status = statusRef.current;
      const currentDir = dirRef.current;

      // Direction keys
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
        if (status === 'idle' || status === 'gameover') {
          startGame();
        } else if (status === 'playing') {
          pauseGame();
        } else if (status === 'paused') {
          resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [startGame, pauseGame, resumeGame]);

  // ── Mobile D-pad handler ──
  const handleDpad = useCallback((dirKey) => {
    const currentDir = dirRef.current;
    if (dirKey === 'up' && currentDir.y !== 1) nextDirRef.current = { x: 0, y: -1 };
    else if (dirKey === 'down' && currentDir.y !== -1) nextDirRef.current = { x: 0, y: 1 };
    else if (dirKey === 'left' && currentDir.x !== 1) nextDirRef.current = { x: -1, y: 0 };
    else if (dirKey === 'right' && currentDir.x !== -1) nextDirRef.current = { x: 1, y: 0 };

    // Auto-start on first d-pad press
    if (statusRef.current === 'idle' || statusRef.current === 'gameover') {
      startGame();
    }
  }, [startGame]);

  // ── Load leaderboard + initial draw on mount ──
  useEffect(() => {
    setLoadingLeaderboard(true);
    getSnakeLeaderboard()
      .then((r) => {
        const data = r.data || [];
        setLeaderboard(data);
        // Set my high score
        if (user) {
          const me = data.find((e) => String(e.user_id) === String(user.id));
          if (me) setHighScore(me.high_score);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLeaderboard(false));

    // Initial draw (idle overlay)
    draw();

    return () => stopInterval();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-[540px] mx-auto pt-8 pb-12 px-4 text-center">
      {/* Back link */}
      <div className="flex items-center justify-start mb-2">
        <Link
          to="/games"
          className="inline-flex items-center gap-1 text-sm text-[#888888] hover:text-[#0A0A0A] transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Games
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-[#0A0A0A] mb-1">Snake</h2>
      <p className="text-sm text-[#888888] mb-4">
        Use arrow keys or WASD to move. Space to pause.
      </p>

      {/* Score display */}
      <div className="flex items-center justify-center gap-8 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
            SCORE
          </p>
          <p className="text-4xl font-black text-[#0A0A0A] leading-none mt-1">
            {score}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
            BEST
          </p>
          <p className="text-sm text-[#888888] font-semibold leading-none mt-1">
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
          className="border-2 border-[#0A0A0A] block"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* React overlay for game over (buttons only — canvas draws the text) */}
        {gameStatus === 'gameover' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-10 gap-3 pointer-events-none">
            <div className="flex flex-col items-center gap-2 pointer-events-auto">
              <button
                type="button"
                className="bg-white text-[#0A0A0A] rounded-none px-6 py-2 font-semibold text-sm hover:bg-[#F0F0F0] transition-colors border border-white"
                onClick={startGame}
              >
                Play Again
              </button>
              <button
                type="button"
                className="text-white border border-white rounded-none px-4 py-2 text-sm hover:bg-white/10 transition-colors"
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
          className="w-12 h-12 bg-[#F7F7F7] border border-[#E0E0E0] rounded-md flex items-center justify-center hover:bg-[#EFEFEF] active:bg-[#E0E0E0] cursor-pointer touch-none"
          onTouchStart={(e) => { e.preventDefault(); handleDpad('up'); }}
          onClick={() => handleDpad('up')}
        >
          <ArrowUp size={18} />
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            className="w-12 h-12 bg-[#F7F7F7] border border-[#E0E0E0] rounded-md flex items-center justify-center hover:bg-[#EFEFEF] active:bg-[#E0E0E0] cursor-pointer touch-none"
            onTouchStart={(e) => { e.preventDefault(); handleDpad('left'); }}
            onClick={() => handleDpad('left')}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="w-12 h-12 bg-[#F7F7F7] border border-[#E0E0E0] rounded-md flex items-center justify-center hover:bg-[#EFEFEF] active:bg-[#E0E0E0] cursor-pointer touch-none"
            onTouchStart={(e) => { e.preventDefault(); handleDpad('down'); }}
            onClick={() => handleDpad('down')}
          >
            <ArrowDown size={18} />
          </button>
          <button
            type="button"
            className="w-12 h-12 bg-[#F7F7F7] border border-[#E0E0E0] rounded-md flex items-center justify-center hover:bg-[#EFEFEF] active:bg-[#E0E0E0] cursor-pointer touch-none"
            onTouchStart={(e) => { e.preventDefault(); handleDpad('right'); }}
            onClick={() => handleDpad('right')}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Leaderboard preview */}
      <div className="mt-10 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888888] mb-4">
          GLOBAL LEADERBOARD
        </p>
        {loadingLeaderboard ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#E0E0E0]">
                <Skeleton className="w-8 h-4" />
                <SkeletonAvatar size="sm" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-10 ml-auto" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        ) : (
          <LeaderboardTable
            entries={leaderboard.slice(0, 5)}
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  );
}
