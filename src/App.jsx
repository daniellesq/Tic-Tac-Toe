import { useMemo, useState } from "react";

/** ========= utilidades de juego ========= **/

function inBounds(n, size) {
  return n >= 0 && n < size;
}

/**
 * Cálculo de ganador generalizado:
 * - board: array 1D de length size*size
 * - size: tamaño del tablero (n x n)
 * - winLen: longitud necesaria para ganar (por defecto 3, <= size)
 * Devuelve { winner: 'X'|'O'|null, line: number[] }
 */
function calculateWinner(board, size, winLen) {
  if (winLen < 3) winLen = 3;
  if (winLen > size) winLen = size;

  const idx = (r, c) => r * size + c;
  const dirs = [
    [0, 1],   // →
    [1, 0],   // ↓
    [1, 1],   // ↘
    [1, -1],  // ↙
  ];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const player = board[idx(r, c)];
      if (!player) continue;

      for (const [dr, dc] of dirs) {
        const line = [idx(r, c)];
        let rr = r + dr, cc = c + dc;
        while (
          inBounds(rr, size) &&
          inBounds(cc, size) &&
          board[idx(rr, cc)] === player
        ) {
          line.push(idx(rr, cc));
          rr += dr; cc += dc;
        }
        if (line.length >= winLen) {
          return { winner: player, line: line.slice(0, winLen) };
        }
      }
    }
  }
  return { winner: null, line: [] };
}

/** Render de ficha según ajustes */
function Piece({ who, settings }) {
  if (!who) return null;
  if (settings.symbolMode === "emoji") {
    return <span aria-hidden>{who === "X" ? "❌" : "⭕"}</span>;
  }
  if (settings.symbolMode === "image") {
    const src = who === "X" ? settings.imgX : settings.imgO;
    return (
      <img
        src={src}
        alt={who}
        style={{ width: "70%", height: "70%", objectFit: "contain", pointerEvents: "none" }}
      />
    );
  }
  // texto clásico
  return <span>{who}</span>;
}

function Square({ value, onClick, highlight, settings }) {
  return (
    <button
      className={`square ${highlight ? "square-win" : ""}`}
      onClick={onClick}
      aria-label={value ? `Casilla ${value}` : "Casilla vacía"}
    >
      <Piece who={value} settings={settings} />
    </button>
  );
}

function Board({ size, xIsNext, squares, onPlay, settings }) {
  const { winner, line } = useMemo(
    () => calculateWinner(squares, size, settings.winLength),
    [squares, size, settings.winLength]
  );

  function handleClick(i) {
    if (squares[i] || winner) return;
    const next = squares.slice();
    next[i] = xIsNext ? "X" : "O";
    onPlay(next);
  }

  const isDraw = !winner && squares.every(Boolean);

  let status;
  if (winner) status = `Ganó: ${winner}`;
  else if (isDraw) status = "Empate 😶";
  else status = `Siguiente jugador: ${xIsNext ? "X" : "O"}`;

  return (
    <>
      <div className="status">{status}</div>
      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${size}, var(--cell))`,
          gridTemplateRows: `repeat(${size}, var(--cell))`,
        }}
      >
        {squares.map((val, i) => (
          <Square
            key={i}
            value={val}
            onClick={() => handleClick(i)}
            highlight={settings.highlightWins && line.includes(i)}
            settings={settings}
          />
        ))}
      </div>
    </>
  );
}

/** ========= Panel de ajustes ========= **/
function Settings({ settings, setSettings, onResetSize }) {
  function update(k, v) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  return (
    <div className="panel">
      <h2>Configuración</h2>

      <label className="row">
        <span>Tamaño del tablero</span>
        <input
          type="number"
          min={3}
          max={10}
          value={settings.boardSize}
          onChange={(e) => {
            const next = Math.max(3, Math.min(10, Number(e.target.value)));
            update("boardSize", next);
          }}
          onBlur={onResetSize}
        />
      </label>

      <label className="row">
        <span>Longitud para ganar</span>
        <input
          type="number"
          min={3}
          max={settings.boardSize}
          value={settings.winLength}
          onChange={(e) => {
            const next = Number(e.target.value);
            update("winLength", Math.max(3, Math.min(settings.boardSize, next)));
          }}
        />
      </label>

      <label className="row">
        <span>Modo de símbolo</span>
        <select
          value={settings.symbolMode}
          onChange={(e) => update("symbolMode", e.target.value)}
        >
          <option value="text">Texto (X/O)</option>
          <option value="emoji">Emoji (❌ / ⭕)</option>
          <option value="image">Imágenes por URL</option>
        </select>
      </label>

      {settings.symbolMode === "image" && (
        <>
          <label className="row">
            <span>URL imagen X</span>
            <input
              type="url"
              placeholder="https://.../x.png"
              value={settings.imgX}
              onChange={(e) => update("imgX", e.target.value)}
            />
          </label>
          <label className="row">
            <span>URL imagen O</span>
            <input
              type="url"
              placeholder="https://.../o.png"
              value={settings.imgO}
              onChange={(e) => update("imgO", e.target.value)}
            />
          </label>
        </>
      )}

      <label className="row check">
        <input
          type="checkbox"
          checked={settings.highlightWins}
          onChange={(e) => update("highlightWins", e.target.checked)}
        />
        <span>Resaltar línea ganadora</span>
      </label>
    </div>
  );
}

/** ========= App ========= **/
export default function App() {
  const [settings, setSettings] = useState({
    boardSize: 3,
    winLength: 3,
    symbolMode: "text", // 'text' | 'emoji' | 'image'
    imgX: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/274c.svg",
    imgO: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2b55.svg",
    highlightWins: true,
  });

  // historia + “time travel” como en el tutorial oficial
  const [history, setHistory] = useState([
    Array(settings.boardSize * settings.boardSize).fill(null),
  ]);
  const [currentMove, setCurrentMove] = useState(0);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  // Si cambia el tamaño, reiniciamos el juego para evitar inconsistencias
  function applyBoardSizeChange() {
    setHistory([Array(settings.boardSize * settings.boardSize).fill(null)]);
    setCurrentMove(0);
    if (settings.winLength > settings.boardSize) {
      setSettings((s) => ({ ...s, winLength: s.boardSize }));
    }
  }

  function handlePlay(nextSquares) {
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function jumpTo(move) {
    setCurrentMove(move);
  }

  function reset() {
    setHistory([Array(settings.boardSize * settings.boardSize).fill(null)]);
    setCurrentMove(0);
  }

  const moves = history.map((_, move) => {
    const desc = move === 0 ? "Ir al inicio" : `Ir al movimiento #${move}`;
    const isCurrent = move === currentMove;
    return (
      <li key={move}>
        <button
          className={`history-btn ${isCurrent ? "active" : ""}`}
          onClick={() => jumpTo(move)}
        >
          {desc}
        </button>
      </li>
    );
  });

  // Easter egg solo con botón 🎓
  const [showEgg, setShowEgg] = useState(false);

  return (
    <div className="game">
      <div className="game-board">
        <Board
          size={settings.boardSize}
          xIsNext={xIsNext}
          squares={currentSquares}
          onPlay={handlePlay}
          settings={settings}
        />
        <div className="actions">
          <button className="reset-btn" onClick={reset}>Reiniciar</button>
        </div>
      </div>

      <div className="game-side">
        <Settings
          settings={settings}
          setSettings={setSettings}
          onResetSize={applyBoardSizeChange}
        />

        <div className="panel">
          <h2>Easter egg</h2>
          <button className="egg-btn" onClick={() => setShowEgg(true)}>👀</button>
        </div>

        <div className="panel">
          <h2>Movimientos</h2>
          <ol>{moves}</ol>
        </div>
      </div>

      {showEgg && (
        <dialog open className="egg" aria-label="Datos del alumno">
          <h3>Datos del alumno</h3>
          <ul>
            <li><strong>Nombre:</strong> Daniel Esquivel Gomez</li>
            <li><strong>Matrícula:</strong> 72965</li>
          </ul>
          <button onClick={() => setShowEgg(false)}>Cerrar</button>
        </dialog>
      )}
    </div>
  );
}
