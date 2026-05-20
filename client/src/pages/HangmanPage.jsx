import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';

// ─── Word bank ────────────────────────────────────────────────────────────────
const WORDS = [
  { word: 'ELEPHANT',   category: 'ANIMALS'   },
  { word: 'DOLPHIN',    category: 'ANIMALS'   },
  { word: 'PENGUIN',    category: 'ANIMALS'   },
  { word: 'GIRAFFE',    category: 'ANIMALS'   },
  { word: 'CHEETAH',    category: 'ANIMALS'   },
  { word: 'PYTHON',     category: 'TECH'      },
  { word: 'JAVASCRIPT', category: 'TECH'      },
  { word: 'DATABASE',   category: 'TECH'      },
  { word: 'NETWORK',    category: 'TECH'      },
  { word: 'ALGORITHM',  category: 'TECH'      },
  { word: 'MANGO',      category: 'FRUITS'    },
  { word: 'PAPAYA',     category: 'FRUITS'    },
  { word: 'AVOCADO',    category: 'FRUITS'    },
  { word: 'BLUEBERRY',  category: 'FRUITS'    },
  { word: 'PINEAPPLE',  category: 'FRUITS'    },
  { word: 'BRAZIL',     category: 'COUNTRIES' },
  { word: 'CANADA',     category: 'COUNTRIES' },
  { word: 'GERMANY',    category: 'COUNTRIES' },
  { word: 'AUSTRALIA',  category: 'COUNTRIES' },
  { word: 'THAILAND',   category: 'COUNTRIES' },
];

const MAX_WRONG = 6;

// ─── Alphabet rows ────────────────────────────────────────────────────────────
const ALPHA_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z'],
];

const HANGMAN_CSS = `
  .hm-key { transition: background 0.15s, color 0.15s, border-color 0.15s; }
  .hm-key-default:hover { background: rgba(255,255,255,0.1) !important; }
  @media (prefers-reduced-motion: reduce) { .hm-key { transition: none; } }
`;

// ─── Gallows SVG ─────────────────────────────────────────────────────────────
function GallowsSVG({ wrongCount }) {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 180 200"
      fill="none"
      stroke="rgba(245,240,239,0.25)"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {/* Base structure — always visible */}
      <line x1="20" y1="190" x2="160" y2="190" />
      <line x1="40" y1="10"  x2="40"  y2="190" />
      <line x1="40" y1="10"  x2="140" y2="10"  />
      <line x1="140" y1="10" x2="140" y2="38"  />

      {/* Head */}
      {wrongCount >= 1 && (
        <circle cx="140" cy="50" r="12" stroke="rgba(245,240,239,0.6)" />
      )}
      {/* Body */}
      {wrongCount >= 2 && (
        <line x1="140" y1="62" x2="140" y2="120" stroke="rgba(245,240,239,0.6)" />
      )}
      {/* Left arm */}
      {wrongCount >= 3 && (
        <line x1="140" y1="75" x2="115" y2="100" stroke="rgba(245,240,239,0.6)" />
      )}
      {/* Right arm */}
      {wrongCount >= 4 && (
        <line x1="140" y1="75" x2="165" y2="100" stroke="rgba(245,240,239,0.6)" />
      )}
      {/* Left leg */}
      {wrongCount >= 5 && (
        <line x1="140" y1="120" x2="115" y2="150" stroke="rgba(245,240,239,0.6)" />
      )}
      {/* Right leg */}
      {wrongCount >= 6 && (
        <line x1="140" y1="120" x2="165" y2="150" stroke="rgba(245,240,239,0.6)" />
      )}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HangmanPage() {
  const [word, setWord] = useState('');
  const [category, setCategory] = useState('');
  const [guessed, setGuessed] = useState(new Set());

  // ── Init / reset ──
  const initGame = useCallback(() => {
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(pick.word);
    setCategory(pick.category);
    setGuessed(new Set());
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // ── Derived ──
  const wrongGuesses = word
    ? [...guessed].filter((l) => !word.includes(l))
    : [];
  const wrongCount = wrongGuesses.length;

  const allLettersGuessed = word
    ? word.split('').every((l) => guessed.has(l))
    : false;

  const isLost = wrongCount >= MAX_WRONG;
  const isWon = allLettersGuessed && !isLost;
  const gameOver = isLost || isWon;

  // ── Guess a letter ──
  const guessLetter = useCallback(
    (letter) => {
      if (gameOver) return;
      if (guessed.has(letter)) return;
      setGuessed((prev) => new Set([...prev, letter]));
    },
    [gameOver, guessed]
  );

  // ── Physical keyboard support ──
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        guessLetter(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guessLetter]);

  return (
    <>
      <style>{HANGMAN_CSS}</style>
      <div className="max-w-[480px] mx-auto pt-8 pb-12 px-4">
        {/* Back link */}
        <Link
          to="/games"
          className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-white/70"
          style={{ color: 'rgba(245,240,239,0.4)' }}
        >
          <ChevronLeft size={16} />
          Back to Games
        </Link>

        <h2
          className="mb-1"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 700,
            fontSize: '1.65rem',
            color: '#F5F0EF',
          }}
        >
          Hangman
        </h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(245,240,239,0.45)' }}>
          Guess the word before the hangman is complete.
        </p>

        <div className="flex flex-col gap-6 items-center">
          {/* 1. Category hint */}
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(245,240,239,0.45)' }}
          >
            Category: {category}
          </p>

          {/* 2. Gallows */}
          <GallowsSVG wrongCount={wrongCount} />

          {/* 3. Word display */}
          <div className="flex gap-2 justify-center flex-wrap">
            {word.split('').map((letter, i) => {
              const revealed = guessed.has(letter);
              const showRed = isLost && !guessed.has(letter);
              return (
                <div
                  key={i}
                  className="w-10 h-12 flex items-center justify-center"
                  style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}
                >
                  {(revealed || gameOver) && (
                    <span
                      className="font-black text-xl"
                      style={{ color: showRed ? '#E87080' : '#F5F0EF' }}
                    >
                      {letter}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Wrong guesses */}
          <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px]">
            {wrongGuesses.length > 0 && (
              <span
                className="text-xs self-center mr-1"
                style={{ color: 'rgba(245,240,239,0.45)' }}
              >
                Wrong:
              </span>
            )}
            {wrongGuesses.map((letter) => (
              <span
                key={letter}
                className="rounded text-sm font-semibold px-2 py-0.5"
                style={{
                  background: 'rgba(139,21,32,0.15)',
                  border: '1px solid rgba(139,21,32,0.35)',
                  color: '#E87080',
                }}
              >
                {letter}
              </span>
            ))}
          </div>

          {/* 5. Keyboard */}
          {!gameOver && (
            <div className="flex flex-col items-center gap-1.5">
              {ALPHA_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-1.5">
                  {row.map((letter) => {
                    const isCorrect = guessed.has(letter) && word.includes(letter);
                    const isWrong = guessed.has(letter) && !word.includes(letter);

                    const keyStyle = isCorrect
                      ? {
                          background: '#8B1520',
                          color: '#F5F0EF',
                          border: '1px solid rgba(139,21,32,0.5)',
                          cursor: 'default',
                        }
                      : isWrong
                      ? {
                          background: 'rgba(255,255,255,0.03)',
                          color: 'rgba(245,240,239,0.2)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'default',
                          textDecoration: 'line-through',
                        }
                      : {
                          background: 'rgba(255,255,255,0.07)',
                          color: '#F5F0EF',
                          border: '1px solid rgba(255,255,255,0.12)',
                          cursor: 'pointer',
                        };

                    return (
                      <button
                        key={letter}
                        type="button"
                        className={`hm-key w-9 h-9 rounded text-sm font-medium${!isCorrect && !isWrong ? ' hm-key-default' : ''}`}
                        style={keyStyle}
                        onClick={() => guessLetter(letter)}
                        disabled={guessed.has(letter)}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* 6. Status — won */}
          {isWon && (
            <div
              className="rounded-lg p-6 text-center w-full"
              style={{
                background: 'rgba(26,122,74,0.15)',
                border: '1px solid rgba(26,122,74,0.35)',
              }}
            >
              <CheckCircle2 size={40} className="mx-auto mb-2" style={{ color: '#4ABA80' }} />
              <p className="font-semibold text-base" style={{ color: '#4ABA80' }}>
                Well done! The word was{' '}
                <span className="font-black" style={{ color: '#F5F0EF' }}>{word}</span>.
              </p>
              <div className="mt-4">
                <Button variant="primary" onClick={initGame}>
                  Play Again
                </Button>
              </div>
            </div>
          )}

          {/* 6. Status — lost */}
          {isLost && (
            <div
              className="rounded-lg p-6 text-center w-full"
              style={{
                background: 'rgba(139,21,32,0.15)',
                border: '1px solid rgba(139,21,32,0.35)',
              }}
            >
              <p className="text-sm mb-1" style={{ color: 'rgba(245,240,239,0.55)' }}>
                The word was
              </p>
              <p className="font-bold text-2xl mb-4" style={{ color: '#E87080' }}>
                {word}
              </p>
              <Button variant="primary" onClick={initGame}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
