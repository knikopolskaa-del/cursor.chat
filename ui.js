(function () {
  const boardEl = document.getElementById("chess-board");
  const currentPlayerEl = document.getElementById("current-player");
  const gameStatusEl = document.getElementById("game-status");
  const newGameBtn = document.getElementById("new-game-btn");
  const flipBoardBtn = document.getElementById("flip-board-btn");

  if (!boardEl || !window.ChessGame) {
    // Если скрипт подключён не на той странице — просто выходим
    return;
  }

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

  let selected = null;
  let legalTargets = [];
  let isFlipped = false;

  function pieceToChar(piece) {
    if (!piece) return "";
    const color = piece[0];
    const type = piece[1];
    const white = color === "w";
    switch (type) {
      case "K":
        return white ? "♔" : "♚";
      case "Q":
        return white ? "♕" : "♛";
      case "R":
        return white ? "♖" : "♜";
      case "B":
        return white ? "♗" : "♝";
      case "N":
        return white ? "♘" : "♞";
      case "P":
        return white ? "♙" : "♟";
      default:
        return "";
    }
  }

  function clearSelection() {
    selected = null;
    legalTargets = [];
  }

  function isSameSquare(a, b) {
    if (!a || !b) return false;
    return a.r === b.r && a.c === b.c;
  }

  function renderBoard() {
    const board = window.ChessGame.getBoard();
    const lastMove = window.ChessGame.getLastMove();
    boardEl.innerHTML = "";

    for (let visualRow = 0; visualRow < 8; visualRow++) {
      for (let visualCol = 0; visualCol < 8; visualCol++) {
        const row = isFlipped ? visualRow : 7 - visualRow;
        const col = isFlipped ? 7 - visualCol : visualCol;

        const square = document.createElement("div");
        square.classList.add("square");

        const isLight = (row + col) % 2 === 0;
        square.classList.add(isLight ? "light" : "dark");

        square.dataset.row = String(row);
        square.dataset.col = String(col);

        const piece = board[row][col];
        if (piece) {
          const pieceEl = document.createElement("span");
          pieceEl.classList.add("piece", piece[0] === "w" ? "white" : "black");
          pieceEl.textContent = pieceToChar(piece);
          square.appendChild(pieceEl);
        }

        if (visualCol === 0) {
          const rankLabel = document.createElement("span");
          rankLabel.classList.add("square-label", "rank");
          rankLabel.textContent = RANKS[row];
          square.appendChild(rankLabel);
        }

        if (visualRow === 7) {
          const fileLabel = document.createElement("span");
          fileLabel.classList.add("square-label", "file");
          fileLabel.textContent = FILES[col];
          square.appendChild(fileLabel);
        }

        if (selected && isSameSquare(selected, { r: row, c: col })) {
          square.classList.add("selected");
        }

        if (legalTargets.some((m) => m.r === row && m.c === col)) {
          const targetPiece = board[row][col];
          if (targetPiece) {
            square.classList.add("capture-target");
          } else {
            square.classList.add("move-target");
          }
        }

        if (
          lastMove &&
          (isSameSquare(lastMove.from, { r: row, c: col }) ||
            isSameSquare(lastMove.to, { r: row, c: col }))
        ) {
          square.classList.add("last-move");
        }

        square.addEventListener("click", onSquareClick);
        boardEl.appendChild(square);
      }
    }

    updateStatus();
  }

  function onSquareClick(e) {
    if (window.ChessGame.isGameOver()) return;
    const target = e.currentTarget;
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    const board = window.ChessGame.getBoard();
    const piece = board[row][col];
    const currentPlayer = window.ChessGame.getCurrentPlayer();

    if (selected && selected.r === row && selected.c === col) {
      clearSelection();
      renderBoard();
      return;
    }

    const isMoveTarget = legalTargets.some((m) => m.r === row && m.c === col);
    if (selected && isMoveTarget) {
      const moved = window.ChessGame.makeMove(
        { r: selected.r, c: selected.c },
        { r: row, c: col }
      );
      clearSelection();
      if (moved) {
        renderBoard();
      } else {
        renderBoard();
      }
      return;
    }

    if (piece && piece[0] === currentPlayer) {
      selected = { r: row, c: col };
      legalTargets =
        window.ChessGame.getLegalMovesForSquare(row, col) || [];
      renderBoard();
      return;
    }

    clearSelection();
    renderBoard();
  }

  function updateStatus() {
    const currentPlayer = window.ChessGame.getCurrentPlayer();
    const status = window.ChessGame.getStatus();

    currentPlayerEl.textContent =
      currentPlayer === "w" ? "Белые" : "Чёрные";

    gameStatusEl.classList.remove("check", "checkmate");

    if (status.checkmate) {
      const winner = status.winner === "w" ? "Белые" : "Чёрные";
      gameStatusEl.textContent = `Мат. Победа: ${winner}.`;
      gameStatusEl.classList.add("checkmate");
    } else if (status.stalemate) {
      gameStatusEl.textContent = "Пат. Ничья.";
    } else if (status.inCheck) {
      gameStatusEl.textContent = "Шах!";
      gameStatusEl.classList.add("check");
    } else {
      gameStatusEl.textContent = "Обычная позиция.";
    }
  }

  function onNewGame() {
    window.ChessGame.reset();
    clearSelection();
    renderBoard();
  }

  function onFlipBoard() {
    isFlipped = !isFlipped;
    renderBoard();
  }

  newGameBtn?.addEventListener("click", onNewGame);
  flipBoardBtn?.addEventListener("click", onFlipBoard);

  window.addEventListener("DOMContentLoaded", () => {
    window.ChessGame.initBoard();
    renderBoard();
  });
})();

