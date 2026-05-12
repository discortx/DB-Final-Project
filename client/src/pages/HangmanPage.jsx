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

// ─── Gallows SVG ─────────────────────────────────────────────────────────────
function GallowsSVG({ wrongCount }) {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 180 200"
      fill="none"
      stroke="#0A0A0A"
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
        <circle cx="140" cy="50" r="12" />
      )}
      {/* Body */}
      {wrongCount >= 2 && (
        <line x1="140" y1="62" x2="140" y2="120" />
      )}
      {/* Left arm */}
      {wrongCount >= 3 && (
        <line x1="140" y1="75" x2="115" y2="100" />
      )}
      {/* Right arm */}
      {wrongCount >= 4 && (
        <line x1="140" y1="75" x2="165" y2="100" />
      )}
      {/* Left leg */}
      {wrongCount >= 5 && (
        <line x1="140" y1="120" x2="115" y2="150" />
      )}
      {/* Right leg */}
      {wrongCount >= 6 && (
        <line x1="140" y1="120" x2="165" y2="150" />
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
    <div className="max-w-[480px] mx-auto pt-8 pb-12 px-4">
      {/* Back link */}
      <Link
        to="/games"
        className="inline-flex items-center gap-1 text-sm text-[#888888] hover:text-[#0A0A0A] mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Games
      </Link>

      <h2 className="text-2xl font-bold text-[#0A0A0A] mb-1">Hangman</h2>
      <p className="text-sm text-[#888888] mb-8">
        Guess the word before the hangman is complete.
      </p>

      <div className="flex flex-col gap-6 items-center">
        {/* 1. Category hint */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
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
                className="w-10 h-12 border-b-2 border-[#0A0A0A] flex items-center justify-center"
              >
                {(revealed || gameOver) && (
                  <span
                    className={`font-black text-xl ${
                      showRed ? 'text-[#CC0000]' : 'text-[#0A0A0A]'
                    }`}
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
            <span className="text-xs text-[#888888] self-center mr-1">
              Wrong:
            </span>
          )}
          {wrongGuesses.map((letter) => (
            <span
              key={letter}
              className="bg-[#EFEFEF] border border-[#E0E0E0] rounded text-sm text-[#CC0000] font-semibold px-2 py-0.5"
            >
              {letter}
            </span>
          ))}
        </div>

        {/* 5. Keyboard (hidden when game over — show result instead) */}
        {!gameOver && (
          <div className="flex flex-col items-center gap-1.5">
            {ALPHA_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map((letter) => {
                  const isCorrect = guessed.has(letter) && word.includes(letter);
                  const isWrong = guessed.has(letter) && !word.includes(letter);
                  let btnCls =
                    'w-9 h-9 border rounded text-sm font-medium transition-colors ';

                  if (isCorrect) {
                    btnCls +=
                      'bg-[#0A0A0A] text-white border-[#0A0A0A] cursor-default';
                  } else if (isWrong) {
                    btnCls +=
                      'bg-[#EFEFEF] text-[#C0C0C0] line-through border-[#E0E0E0] cursor-default';
                  } else {
                    btnCls +=
                      'bg-white text-[#0A0A0A] border-[#E0E0E0] hover:bg-[#F7F7F7] cursor-pointer';
                  }

                  return (
                    <button
                      key={letter}
                      type="button"
                      className={btnCls}
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
          <div className="bg-[#F0FDF4] border border-[#1A7A4A] rounded-lg p-6 text-center w-full">
            <CheckCircle2 size={40} className="text-[#1A7A4A] mx-auto mb-2" />
            <p className="text-[#1A7A4A] font-semibold text-base">
              Well done! The word was{' '}
              <span className="font-black">{word}</span>.
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
          <div className="bg-[#FFF5F5] border border-[#CC0000] rounded-lg p-6 text-center w-full">
            <p className="text-[#404040] text-sm mb-1">The word was</p>
            <p className="font-bold text-[#CC0000] text-2xl mb-4">{word}</p>
            <Button variant="primary" onClick={initGame}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
