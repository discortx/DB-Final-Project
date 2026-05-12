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
    <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: 360 }}>
      {cells.map((val, i) => {
        const isEmpty = val === '-';
        const isWinCell = winLine?.includes(i);
        const isPlayable = isEmpty && isMyTurn && !loading;

        let cellCls =
          'aspect-square flex items-center justify-center rounded-md border transition-all select-none ';

        if (isWinCell) {
          cellCls += 'bg-[#0A0A0A] border-[#0A0A0A] cursor-default';
        } else if (isEmpty) {
          if (isPlayable) {
            cellCls +=
              'bg-[#F7F7F7] border-[#E0E0E0] cursor-pointer hover:bg-[#EFEFEF] hover:border-[#C0C0C0] hover:scale-[1.02]';
          } else {
            cellCls += 'bg-[#F7F7F7] border-[#E0E0E0] cursor-not-allowed';
          }
        } else {
          cellCls += 'bg-[#F7F7F7] border-[#E0E0E0] cursor-default';
        }

        let textCls = 'font-black text-3xl ';
        if (isWinCell) {
          textCls += 'text-white';
        } else if (val === 'X') {
          textCls += 'text-[#0A0A0A]';
        } else if (val === 'O') {
          textCls += 'text-[#888888]';
        }

        return (
          <button
            key={i}
            type="button"
            className={cellCls}
            onClick={() => isPlayable && onCellClick && onCellClick(i)}
            disabled={!isPlayable}
            style={{ minHeight: 100 }}
          >
            <span className={textCls}>{val !== '-' ? val : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
