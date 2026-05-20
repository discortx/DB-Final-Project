/**
 * TicTacToeBoard — reusable 3×3 board component
 * Props:
 *   board     — 9-char string, '-' for empty
 *   winLine   — array of 3 indices that form the win, or null
 *   isMyTurn  — bool
 *   myMark    — 'X' | 'O'
 *   onCellClick — fn(index)
 *   loading   — bool
 */

const TTT_BOARD_CSS = `
  .ttt-cell { transition: background 0.15s, border-color 0.15s, transform 0.1s; }
  .ttt-cell-playable:hover {
    background: rgba(139,21,32,0.12) !important;
    border-color: rgba(139,21,32,0.4) !important;
    transform: scale(1.03);
  }
  @media (prefers-reduced-motion: reduce) {
    .ttt-cell { transition: none; }
    .ttt-cell-playable:hover { transform: none; }
  }
`;

export default function TicTacToeBoard({
  board = '---------',
  winLine = null,
  isMyTurn = false,
  myMark = 'X',
  onCellClick,
  loading = false,
}) {
  const cells = board.split('');

  return (
    <>
      <style>{TTT_BOARD_CSS}</style>
      <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: 360 }}>
        {cells.map((val, i) => {
          const isEmpty = val === '-';
          const isWinCell = winLine?.includes(i);
          const isPlayable = isEmpty && isMyTurn && !loading;

          const cellStyle = isWinCell
            ? {
                background: 'rgba(139,21,32,0.25)',
                border: '1px solid rgba(139,21,32,0.5)',
                cursor: 'default',
              }
            : isEmpty
            ? isPlayable
              ? {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }
              : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'not-allowed',
                }
            : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'default',
              };

          const textColor = isWinCell
            ? '#F5F0EF'
            : val === 'X'
            ? '#8B1520'
            : val === 'O'
            ? 'rgba(245,240,239,0.75)'
            : 'transparent';

          return (
            <button
              key={i}
              type="button"
              className={`ttt-cell aspect-square flex items-center justify-center rounded-md select-none${isPlayable ? ' ttt-cell-playable' : ''}`}
              style={{ ...cellStyle, minHeight: 100 }}
              onClick={() => isPlayable && onCellClick && onCellClick(i)}
              disabled={!isPlayable}
            >
              <span
                className="font-black text-3xl"
                style={{ color: textColor }}
              >
                {val !== '-' ? val : ''}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
