(function () {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  let boardEl;
  let notationBodyEl;
  let isFlipped = false;

  // -1 = начальная позиция, 0..N = позиция после N-го полухода
  let viewIndex = -1;

  // Данные партии из localStorage
  let gameData = null;

  // ── Рендер фигур ──────────────────────────────────────────────────────────

  function pieceToChar(piece) {
    if (!piece) return "";
    const color = piece[0];
    const type  = piece[1];
    const white = color === "w";
    switch (type) {
      case "K": return white ? "♔" : "♚";
      case "Q": return white ? "♕" : "♛";
      case "R": return white ? "♖" : "♜";
      case "B": return white ? "♗" : "♝";
      case "N": return white ? "♘" : "♞";
      case "P": return white ? "♙" : "♟";
      default:  return "";
    }
  }

  function isSameSquare(a, b) {
    return a && b && a.r === b.r && a.c === b.c;
  }

  // ── Данные текущей позиции ─────────────────────────────────────────────────

  function getBoardData() {
    if (viewIndex < 0) return gameData.initialBoardSnapshot ?? null;
    return gameData.boardSnapshots?.[viewIndex] ?? null;
  }

  function getLastMoveData() {
    if (viewIndex < 0) return null;
    return gameData.moveHistoryMeta?.[viewIndex] ?? null;
  }

  // ── Отрисовка доски ────────────────────────────────────────────────────────

  function renderBoard() {
    const boardData    = getBoardData();
    const lastMoveData = getLastMoveData();
    if (!boardData) return;
    boardEl.innerHTML  = "";

    for (let visualRow = 0; visualRow < 8; visualRow++) {
      for (let visualCol = 0; visualCol < 8; visualCol++) {
        const row = isFlipped ? visualRow : 7 - visualRow;
        const col = isFlipped ? 7 - visualCol : visualCol;

        const square = document.createElement("div");
        square.classList.add("square");

        const isLight = (row + col) % 2 === 0;
        square.classList.add(isLight ? "light" : "dark");

        const piece = boardData[row][col];
        if (piece) {
          const pieceEl = document.createElement("span");
          pieceEl.classList.add("piece", piece[0] === "w" ? "white" : "black");
          pieceEl.textContent = pieceToChar(piece);
          square.appendChild(pieceEl);
        }

        if (visualCol === 0) {
          const label = document.createElement("span");
          label.classList.add("square-label", "rank", isLight ? "light" : "dark");
          label.textContent = String(8 - row);
          square.appendChild(label);
        }
        if (visualRow === 7) {
          const label = document.createElement("span");
          label.classList.add("square-label", "file", isLight ? "light" : "dark");
          label.textContent = FILES[col];
          square.appendChild(label);
        }

        if (lastMoveData && (isSameSquare(lastMoveData.from, { r: row, c: col }) ||
            isSameSquare(lastMoveData.to,   { r: row, c: col }))) {
          square.classList.add("last-move");
        }

        boardEl.appendChild(square);
      }
    }

    renderNotation();
  }

  // ── Отрисовка нотации ──────────────────────────────────────────────────────

  function renderNotation() {
    const history = gameData.moveHistory;
    notationBodyEl.innerHTML = "";

    if (history.length === 0) {
      const ph = document.createElement("span");
      ph.className = "notation-empty";
      ph.textContent = "Ходов нет";
      notationBodyEl.appendChild(ph);
      return;
    }

    let activeEl = null;

    for (let i = 0; i < history.length; i += 2) {
      const pair = document.createElement("span");
      pair.className = "n-pair";

      const num = document.createElement("span");
      num.className = "n-num";
      num.textContent = (Math.floor(i / 2) + 1) + ".";

      const white = document.createElement("span");
      white.className = "n-w";
      white.textContent = history[i];
      if (i === viewIndex) { white.classList.add("n-active"); activeEl = white; }

      pair.appendChild(num);
      pair.appendChild(white);

      if (history[i + 1] !== undefined) {
        const black = document.createElement("span");
        black.className = "n-b";
        black.textContent = history[i + 1];
        if (i + 1 === viewIndex) { black.classList.add("n-active"); activeEl = black; }
        pair.appendChild(black);
      }

      notationBodyEl.appendChild(pair);
    }

    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      notationBodyEl.scrollTop = notationBodyEl.scrollHeight;
    }
  }

  // ── Инициализация ──────────────────────────────────────────────────────────

  function initAnalysis() {
    // Загружаем данные партии
    try {
      gameData = JSON.parse(localStorage.getItem("lastGame"));
    } catch (e) {
      gameData = null;
    }

    if (!gameData || !gameData.moveHistory) {
      // Нет данных — возвращаемся на главную
      window.location.href = "/";
      return;
    }

    boardEl        = document.getElementById("chess-board");
    notationBodyEl = document.getElementById("notation-body");

    // Начинаем с последней позиции партии
    viewIndex = gameData.moveHistory.length - 1;
    renderBoard();

    // Навигация
    document.getElementById("notation-first")?.addEventListener("click", () => {
      viewIndex = -1;
      renderBoard();
    });
    document.getElementById("notation-prev")?.addEventListener("click", () => {
      if (viewIndex > -1) viewIndex--;
      renderBoard();
    });
    document.getElementById("notation-next")?.addEventListener("click", () => {
      if (viewIndex < gameData.moveHistory.length - 1) viewIndex++;
      renderBoard();
    });
    document.getElementById("notation-last")?.addEventListener("click", () => {
      viewIndex = gameData.moveHistory.length - 1;
      renderBoard();
    });

    // Перевернуть доску
    document.getElementById("flip-board-btn")?.addEventListener("click", () => {
      isFlipped = !isFlipped;
      renderBoard();
    });

    // Новая партия: удаляем данные анализа и возвращаемся на главную
    document.getElementById("new-game-btn")?.addEventListener("click", () => {
      localStorage.removeItem("lastGame");
      window.location.href = "/";
    });

    // Клавиатурная навигация: ← → Home End
    document.addEventListener("keydown", (e) => {
      const last = gameData.moveHistory.length - 1;
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp") {
        if (viewIndex > -1) { viewIndex--; renderBoard(); }
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (viewIndex < last) { viewIndex++; renderBoard(); }
      } else if (e.key === "Home") {
        viewIndex = -1; renderBoard();
      } else if (e.key === "End") {
        viewIndex = last; renderBoard();
      }
    });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initAnalysis);
  } else {
    initAnalysis();
  }
})();
