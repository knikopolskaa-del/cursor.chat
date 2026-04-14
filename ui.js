(function () {
  let boardEl;
  let turnIndicatorEl;
  let playerNameEl;
  let gameStateEl;
  let newGameBtn;
  let resignBtn;
  let drawBtn;
  let analysisBtn;
  let notationBodyEl;

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  let selected = null;
  let legalTargets = [];
  let isFlipped = false;
  let resigned = false;
  let drawAgreed = false;

  function pieceToChar(piece) {
    if (!piece) return "";
    const color = piece[0];
    const type = piece[1];
    const white = color === "w";
    switch (type) {
      case "K": return white ? "♔" : "♚";
      case "Q": return white ? "♕" : "♛";
      case "R": return white ? "♖" : "♜";
      case "B": return white ? "♗" : "♝";
      case "N": return white ? "♘" : "♞";
      case "P": return white ? "♙" : "♟";
      default: return "";
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
    const board    = window.ChessGame.getBoard();
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

        // Coordinate labels
        if (visualCol === 0) {
          const rankLabel = document.createElement("span");
          rankLabel.classList.add("square-label", "rank", isLight ? "light" : "dark");
          rankLabel.textContent = String(8 - row);
          square.appendChild(rankLabel);
        }

        if (visualRow === 7) {
          const fileLabel = document.createElement("span");
          fileLabel.classList.add("square-label", "file", isLight ? "light" : "dark");
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

        if (lastMove && (isSameSquare(lastMove.from, { r: row, c: col }) ||
            isSameSquare(lastMove.to, { r: row, c: col }))) {
          square.classList.add("last-move");
        }

        square.addEventListener("click", onSquareClick);
        square.addEventListener("mousedown", onDragStart);
        square.addEventListener("touchstart", onTouchStart, { passive: false });
        boardEl.appendChild(square);
      }
    }

    updateStatus();
    renderNotation();
  }

  // ── Drag & Drop ──────────────────────────────────────

  let dragState = null;

  function onDragStart(e) {
    if (window.ChessGame.isGameOver()) return;
    const sq = e.currentTarget;
    const row = parseInt(sq.dataset.row, 10);
    const col = parseInt(sq.dataset.col, 10);
    const board = window.ChessGame.getBoard();
    const piece = board[row][col];
    const currentPlayer = window.ChessGame.getCurrentPlayer();

    if (!piece || piece[0] !== currentPlayer) return;

    e.preventDefault();

    selected = { r: row, c: col };
    legalTargets = window.ChessGame.getLegalMovesForSquare(row, col) || [];
    renderBoard();

    const ghost = document.createElement("span");
    ghost.classList.add("piece", piece[0] === "w" ? "white" : "black", "dragging");
    ghost.textContent = pieceToChar(piece);
    ghost.style.left = e.clientX + "px";
    ghost.style.top = e.clientY + "px";
    document.body.appendChild(ghost);

    const originPiece = boardEl.querySelector(
      '[data-row="' + row + '"][data-col="' + col + '"] .piece'
    );
    if (originPiece) originPiece.style.opacity = "0.3";

    dragState = { ghost, fromRow: row, fromCol: col, originPiece };

    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState) return;
    dragState.ghost.style.left = e.clientX + "px";
    dragState.ghost.style.top = e.clientY + "px";
  }

  function onDragEnd(e) {
    if (!dragState) return;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);

    dragState.ghost.remove();
    if (dragState.originPiece) dragState.originPiece.style.opacity = "";

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const sq = targetEl?.closest(".square");

    if (sq) {
      const toRow = parseInt(sq.dataset.row, 10);
      const toCol = parseInt(sq.dataset.col, 10);
      const isLegal = legalTargets.some((m) => m.r === toRow && m.c === toCol);

      if (isLegal) {
        window.ChessGame.makeMove(
          { r: dragState.fromRow, c: dragState.fromCol },
          { r: toRow, c: toCol }
        );
        clearSelection();
      }
    }

    dragState = null;
    renderBoard();
  }

  // Touch equivalents
  function onTouchStart(e) {
    if (window.ChessGame.isGameOver()) return;
    const touch = e.touches[0];
    const sq = e.currentTarget;
    const row = parseInt(sq.dataset.row, 10);
    const col = parseInt(sq.dataset.col, 10);
    const board = window.ChessGame.getBoard();
    const piece = board[row][col];
    const currentPlayer = window.ChessGame.getCurrentPlayer();

    if (!piece || piece[0] !== currentPlayer) return;

    e.preventDefault();

    selected = { r: row, c: col };
    legalTargets = window.ChessGame.getLegalMovesForSquare(row, col) || [];
    renderBoard();

    const ghost = document.createElement("span");
    ghost.classList.add("piece", piece[0] === "w" ? "white" : "black", "dragging");
    ghost.textContent = pieceToChar(piece);
    ghost.style.left = touch.clientX + "px";
    ghost.style.top = touch.clientY + "px";
    document.body.appendChild(ghost);

    const originPiece = boardEl.querySelector(
      '[data-row="' + row + '"][data-col="' + col + '"] .piece'
    );
    if (originPiece) originPiece.style.opacity = "0.3";

    dragState = { ghost, fromRow: row, fromCol: col, originPiece };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  }

  function onTouchMove(e) {
    if (!dragState) return;
    e.preventDefault();
    const touch = e.touches[0];
    dragState.ghost.style.left = touch.clientX + "px";
    dragState.ghost.style.top = touch.clientY + "px";
  }

  function onTouchEnd(e) {
    if (!dragState) return;
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);

    dragState.ghost.remove();
    if (dragState.originPiece) dragState.originPiece.style.opacity = "";

    const touch = e.changedTouches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const sq = targetEl?.closest(".square");

    if (sq) {
      const toRow = parseInt(sq.dataset.row, 10);
      const toCol = parseInt(sq.dataset.col, 10);
      const isLegal = legalTargets.some((m) => m.r === toRow && m.c === toCol);

      if (isLegal) {
        window.ChessGame.makeMove(
          { r: dragState.fromRow, c: dragState.fromCol },
          { r: toRow, c: toCol }
        );
        clearSelection();
      }
    }

    dragState = null;
    renderBoard();
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
      window.ChessGame.makeMove({ r: selected.r, c: selected.c }, { r: row, c: col });
      clearSelection();
      renderBoard();
      return;
    }

    if (piece && piece[0] === currentPlayer) {
      selected = { r: row, c: col };
      legalTargets = window.ChessGame.getLegalMovesForSquare(row, col) || [];
      renderBoard();
      return;
    }

    clearSelection();
    renderBoard();
  }

  // Отрисовывает нотацию как текст с переносом.
  // Формат: 1.e4 e5  2.Nf3 Nc6  3.Bb5 a6 ...
  // Ходы идут строчкой — несколько пар на одну видимую строку.
  function renderNotation() {
    if (!notationBodyEl) return;

    const history = window.ChessGame.getMoveHistory();
    notationBodyEl.innerHTML = "";

    if (history.length === 0) {
      const ph = document.createElement("span");
      ph.className = "notation-empty";
      ph.textContent = "Ходов пока нет";
      notationBodyEl.appendChild(ph);
      return;
    }

    // Подсвечиваем последний сделанный ход
    const lastPly = history.length - 1;

    for (let i = 0; i < history.length; i += 2) {
      const pair = document.createElement("span");
      pair.className = "n-pair";

      const num = document.createElement("span");
      num.className = "n-num";
      num.textContent = (Math.floor(i / 2) + 1) + ".";

      const white = document.createElement("span");
      white.className = "n-w";
      white.textContent = history[i];
      if (i === lastPly) white.classList.add("n-active");

      pair.appendChild(num);
      pair.appendChild(white);

      if (history[i + 1] !== undefined) {
        const black = document.createElement("span");
        black.className = "n-b";
        black.textContent = history[i + 1];
        if (i + 1 === lastPly) black.classList.add("n-active");
        pair.appendChild(black);
      }

      notationBodyEl.appendChild(pair);
    }

    notationBodyEl.scrollTop = notationBodyEl.scrollHeight;
  }

  function updateStatus() {
    const currentPlayer = window.ChessGame.getCurrentPlayer();
    const status = window.ChessGame.getStatus();

    // Update turn indicator
    const isWhite = currentPlayer === "w";
    turnIndicatorEl.className = "turn-indicator " + (isWhite ? "white" : "black");
    turnIndicatorEl.textContent = isWhite ? "♔" : "♚";
    playerNameEl.textContent = isWhite ? "Белые" : "Чёрные";

    // Update game state
    gameStateEl.className = "game-state";
    
    if (status.checkmate) {
      const winner = status.winner === "w" ? "Белые" : "Чёрные";
      gameStateEl.textContent = "Мат! Победа: " + winner;
      gameStateEl.classList.add("checkmate");
    } else if (status.stalemate && drawAgreed) {
      gameStateEl.textContent = "Ничья по соглашению";
      gameStateEl.classList.add("normal");
    } else if (status.stalemate) {
      gameStateEl.textContent = "Пат — ничья";
      gameStateEl.classList.add("normal");
    } else if (resigned && status.winner) {
      const winner = status.winner === "w" ? "Белые" : "Чёрные";
      gameStateEl.textContent = "Победа " + winner + " (соперник сдался)";
      gameStateEl.classList.add("checkmate");
    } else if (status.inCheck) {
      gameStateEl.textContent = "⚠ Шах!";
      gameStateEl.classList.add("check");
    } else if (window.ChessGame.isGameOver()) {
      gameStateEl.textContent = "Игра завершена";
      gameStateEl.classList.add("normal");
    } else {
      gameStateEl.textContent = "Ваш ход";
      gameStateEl.classList.add("normal");
    }

    // Кнопка Анализ активна только когда игра завершена
    if (analysisBtn) analysisBtn.disabled = !window.ChessGame.isGameOver();
  }

  function onNewGame() {
    window.ChessGame.reset();
    resigned = false;
    drawAgreed = false;
    clearSelection();
    renderBoard();
  }

  function initGame() {
    if (!window.ChessGame) return;

    boardEl         = document.getElementById("chess-board");
    turnIndicatorEl = document.getElementById("turn-indicator");
    playerNameEl    = document.getElementById("player-name");
    gameStateEl     = document.getElementById("game-state");
    newGameBtn      = document.getElementById("new-game-btn");
    resignBtn       = document.getElementById("resign-btn");
    analysisBtn     = document.getElementById("analysis-btn");
    drawBtn         = document.getElementById("draw-btn");
    notationBodyEl  = document.getElementById("notation-body");

    if (!boardEl || !playerNameEl || !gameStateEl) return;

    // Кнопка Анализ: сохраняем партию в localStorage и переходим на страницу анализа
    analysisBtn?.addEventListener("click", () => {
      const game = {
        moveHistory:         window.ChessGame.getMoveHistory(),
        boardSnapshots:      window.ChessGame.getBoardSnapshots(),
        moveHistoryMeta:     window.ChessGame.getMoveHistoryMeta(),
        initialBoardSnapshot: window.ChessGame.getInitialBoard(),
      };
      localStorage.setItem("lastGame", JSON.stringify(game));
      window.location.href = "/analysis";
    });

    newGameBtn?.addEventListener("click", onNewGame);

    resignBtn?.addEventListener("click", () => {
      if (window.ChessGame.isGameOver()) return;
      resigned = true;
      drawAgreed = false;
      window.ChessGame.resign(window.ChessGame.getCurrentPlayer());
      clearSelection();
      renderBoard();
    });
    
    drawBtn?.addEventListener("click", () => {
      if (window.ChessGame.isGameOver()) return;
      resigned = false;
      drawAgreed = true;
      window.ChessGame.agreeDraw();
      clearSelection();
      renderBoard();
    });

    window.ChessGame.initBoard();
    renderBoard();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initGame);
  } else {
    initGame();
  }
})();
