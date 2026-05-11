import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSnake, getLeaderboard } from '../api/games';

const COLS = 20, ROWS = 20, CELL = 20;
const W = COLS * CELL, H = ROWS * CELL;
const DIRS = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
               w: [0,-1], s: [0,1], a: [-1,0], d: [1,0] };

function rnd() { return [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)]; }

const initState = () => {
  const head = [10, 10];
  return {
    snake: [head, [9, 10], [8, 10]],
    dir:   [1, 0],
    food:  rnd(),
    alive: false,
    started: false,
    score: 0,
  };
};

export default function SnakePage() {
  const navigate  = useNavigate();
  const canvasRef = useRef(null);
  const stateRef  = useRef(initState());
  const frameRef  = useRef(null);
  const [display, setDisplay] = useState({ score: 0, alive: false, started: false });
  const [submitted, setSubmitted] = useState(false);
  const [board, setBoard] = useState([]);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { snake, food, alive } = stateRef.current;

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food[0] * CELL + CELL / 2, food[1] * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? (alive ? '#2563eb' : '#9ca3af') : (alive ? '#3b82f6' : '#d1d5db');
      const r = i === 0 ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, r);
      ctx.fill();
    });
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;

    const [hx, hy] = s.snake[0];
    const [dx, dy] = s.dir;
    const nx = hx + dx, ny = hy + dy;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || s.snake.some(([x, y]) => x === nx && y === ny)) {
      stateRef.current = { ...s, alive: false };
      setDisplay((d) => ({ ...d, alive: false }));
      draw();
      return;
    }

    const ate = nx === s.food[0] && ny === s.food[1];
    const newSnake = [[nx, ny], ...s.snake.slice(0, ate ? undefined : -1)];
    const newFood  = ate ? rnd() : s.food;
    const newScore = ate ? s.score + 1 : s.score;

    stateRef.current = { ...s, snake: newSnake, food: newFood, score: newScore };
    setDisplay((d) => ({ ...d, score: newScore }));
    draw();
  }, [draw]);

  useEffect(() => {
    const interval = setInterval(tick, 140);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    getLeaderboard().then((r) => setBoard(r.data));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (DIRS[e.key]) {
        e.preventDefault();
        const s = stateRef.current;
        const [dx, dy] = DIRS[e.key];
        const [cx, cy] = s.dir;
        if (dx === -cx && dy === -cy) return;
        stateRef.current = { ...s, dir: [dx, dy] };
      }
      if (e.key === ' ' || e.key === 'Enter') {
        const s = stateRef.current;
        if (!s.alive) {
          stateRef.current = { ...initState(), alive: true, started: true };
          setDisplay({ score: 0, alive: true, started: true });
          setSubmitted(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = async () => {
    try {
      await submitSnake(stateRef.current.score);
      setSubmitted(true);
      const r = await getLeaderboard();
      setBoard(r.data);
    } catch {}
  };

  const startGame = () => {
    stateRef.current = { ...initState(), alive: true, started: true };
    setDisplay({ score: 0, alive: true, started: true });
    setSubmitted(false);
    canvasRef.current?.focus();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/games')} className="text-sm text-gray-500 hover:text-gray-700">← Lobby</button>
        <h1 className="text-2xl font-bold text-gray-900">🐍 Snake</h1>
        <span className="ml-auto text-lg font-bold text-gray-700">Score: {display.score}</span>
      </div>

      <div className="flex gap-6 flex-wrap">
        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={canvasRef}
            width={W} height={H}
            tabIndex={0}
            className="border-2 border-gray-200 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={startGame}
          />

          {!display.started && (
            <p className="text-gray-500 text-sm">Click canvas or press Space to start</p>
          )}
          {display.started && !display.alive && (
            <div className="text-center space-y-2">
              <p className="font-semibold text-gray-900">Game over! Score: {display.score}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={startGame} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  Play Again
                </button>
                {!submitted && display.score > 0 && (
                  <button onClick={handleSubmit} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Submit Score
                  </button>
                )}
                {submitted && <span className="text-sm text-green-600 py-1.5">✓ Score submitted!</span>}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 text-center">
            Arrow keys or WASD to move · Space/Enter to restart
          </div>
        </div>

        <div className="flex-1 min-w-48">
          <h2 className="font-semibold text-gray-900 mb-3">🏆 Leaderboard</h2>
          {board.length === 0 && <p className="text-gray-400 text-sm">No scores yet.</p>}
          <div className="space-y-2">
            {board.map((e) => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                <span className={`text-sm font-bold w-5 ${e.rank === 1 ? 'text-yellow-500' : e.rank === 2 ? 'text-gray-400' : e.rank === 3 ? 'text-amber-600' : 'text-gray-300'}`}>
                  {e.rank}
                </span>
                <span className="flex-1 text-sm text-gray-700 truncate">{e.first_name} {e.last_name}</span>
                <span className="text-sm font-semibold">{e.high_score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
