// Базовая логика шахмат для локальной игры 1v1
(function () {
  const WHITE = "w";
  const BLACK = "b";

  const PIECES = {
    P: "P",
    N: "N",
    B: "B",
    R: "R",
    Q: "Q",
    K: "K",
  };

  let board = [];
  let currentPlayer = WHITE;
  let gameOver = false;
  let status = {
    inCheck: false,
    checkmate: false,
    stalemate: false,
    winner: null,
  };
  let lastMove = null;

  function cloneBoard(srcBoard) {
    return srcBoard.map((row) => row.slice());
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function getPiece(r, c, b = board) {
    if (!inBounds(r, c)) return null;
    return b[r][c];
  }

  function isColor(piece, color) {
    return piece && piece[0] === color;
  }

  function getKingPosition(color, b = board) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p[0] === color && p[1] === PIECES.K) {
          return { r, c };
        }
      }
    }
    return null;
  }

  function isSquareAttacked(targetR, targetC, byColor, b = board) {
    const dir = byColor === WHITE ? -1 : 1;
    // Атаки пешек
    const pawnRow = targetR + dir;
    for (const dc of [-1, 1]) {
      const pc = targetC + dc;
      const p = getPiece(pawnRow, pc, b);
      if (p && p[0] === byColor && p[1] === PIECES.P) {
        return true;
      }
    }

    // Атаки коней
    const knightJumps = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    for (const [dr, dc] of knightJumps) {
      const r = targetR + dr;
      const c = targetC + dc;
      const p = getPiece(r, c, b);
      if (p && p[0] === byColor && p[1] === PIECES.N) {
        return true;
      }
    }

    // Линии ладьи и ферзя
    const rookDirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dr, dc] of rookDirs) {
      let r = targetR + dr;
      let c = targetC + dc;
      while (inBounds(r, c)) {
        const p = getPiece(r, c, b);
        if (p) {
          if (p[0] === byColor && (p[1] === PIECES.R || p[1] === PIECES.Q)) {
            return true;
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Диагонали слона и ферзя
    const bishopDirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [dr, dc] of bishopDirs) {
      let r = targetR + dr;
      let c = targetC + dc;
      while (inBounds(r, c)) {
        const p = getPiece(r, c, b);
        if (p) {
          if (p[0] === byColor && (p[1] === PIECES.B || p[1] === PIECES.Q)) {
            return true;
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Атаки короля
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = targetR + dr;
        const c = targetC + dc;
        const p = getPiece(r, c, b);
        if (p && p[0] === byColor && p[1] === PIECES.K) {
          return true;
        }
      }
    }

    return false;
  }

  function isInCheck(color, b = board) {
    const kingPos = getKingPosition(color, b);
    if (!kingPos) return false;
    const enemy = color === WHITE ? BLACK : WHITE;
    return isSquareAttacked(kingPos.r, kingPos.c, enemy, b);
  }

  function generateMovesForPiece(r, c, b = board) {
    const piece = getPiece(r, c, b);
    if (!piece) return [];
    const color = piece[0];
    const type = piece[1];
    const dir = color === WHITE ? -1 : 1;
    const moves = [];

    if (type === PIECES.P) {
      const oneStepR = r + dir;
      if (inBounds(oneStepR, c) && !getPiece(oneStepR, c, b)) {
        moves.push({ r: oneStepR, c });
        const startRank = color === WHITE ? 6 : 1;
        const twoStepR = r + dir * 2;
        if (r === startRank && !getPiece(twoStepR, c, b)) {
          moves.push({ r: twoStepR, c });
        }
      }
      for (const dc of [-1, 1]) {
        const tr = r + dir;
        const tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        const target = getPiece(tr, tc, b);
        if (target && !isColor(target, color)) {
          moves.push({ r: tr, c: tc });
        }
      }
    } else if (type === PIECES.N) {
      const knightJumps = [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
      ];
      for (const [dr, dc] of knightJumps) {
        const tr = r + dr;
        const tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        const target = getPiece(tr, tc, b);
        if (!target || !isColor(target, color)) {
          moves.push({ r: tr, c: tc });
        }
      }
    } else if (type === PIECES.B || type === PIECES.R || type === PIECES.Q) {
      const dirs = [];
      if (type === PIECES.B || type === PIECES.Q) {
        dirs.push(
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        );
      }
      if (type === PIECES.R || type === PIECES.Q) {
        dirs.push(
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        );
      }
      for (const [dr, dc] of dirs) {
        let tr = r + dr;
        let tc = c + dc;
        while (inBounds(tr, tc)) {
          const target = getPiece(tr, tc, b);
          if (!target) {
            moves.push({ r: tr, c: tc });
          } else {
            if (!isColor(target, color)) {
              moves.push({ r: tr, c: tc });
            }
            break;
          }
          tr += dr;
          tc += dc;
        }
      }
    } else if (type === PIECES.K) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const tr = r + dr;
          const tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          const target = getPiece(tr, tc, b);
          if (!target || !isColor(target, color)) {
            moves.push({ r: tr, c: tc });
          }
        }
      }
    }

    return moves;
  }

  function generateLegalMovesForSquare(r, c) {
    const piece = getPiece(r, c);
    if (!piece || !isColor(piece, currentPlayer)) return [];

    const pseudoMoves = generateMovesForPiece(r, c);
    const legal = [];

    for (const move of pseudoMoves) {
      const bCopy = cloneBoard(board);
      bCopy[move.r][move.c] = bCopy[r][c];
      bCopy[r][c] = null;
      if (!isInCheck(currentPlayer, bCopy)) {
        legal.push(move);
      }
    }

    return legal;
  }

  function generateAllLegalMoves(color = currentPlayer, b = board) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p || p[0] !== color) continue;
        const pseudoMoves = generateMovesForPiece(r, c, b);
        for (const m of pseudoMoves) {
          const bCopy = cloneBoard(b);
          bCopy[m.r][m.c] = bCopy[r][c];
          bCopy[r][c] = null;
          if (!isInCheck(color, bCopy)) {
            moves.push({ from: { r, c }, to: { r: m.r, c: m.c } });
          }
        }
      }
    }
    return moves;
  }

  function updateStatus() {
    const inCheckNow = isInCheck(currentPlayer);
    const legalMoves = generateAllLegalMoves(currentPlayer);
    status.inCheck = inCheckNow;
    status.checkmate = false;
    status.stalemate = false;
    status.winner = null;
    gameOver = false;

    if (legalMoves.length === 0) {
      if (inCheckNow) {
        status.checkmate = true;
        status.winner = currentPlayer === WHITE ? BLACK : WHITE;
        gameOver = true;
      } else {
        status.stalemate = true;
        gameOver = true;
      }
    }
  }

  function makeMove(from, to) {
    if (gameOver) return false;
    const { r: fr, c: fc } = from;
    const { r: tr, c: tc } = to;
    const piece = getPiece(fr, fc);
    if (!piece || !isColor(piece, currentPlayer)) return false;

    const legal = generateLegalMovesForSquare(fr, fc);
    if (!legal.some((m) => m.r === tr && m.c === tc)) {
      return false;
    }

    board[tr][tc] = board[fr][fc];
    board[fr][fc] = null;

    const pawnPromotionRank = currentPlayer === WHITE ? 0 : 7;
    if (board[tr][tc][1] === PIECES.P && tr === pawnPromotionRank) {
      board[tr][tc] = currentPlayer + PIECES.Q;
    }

    lastMove = { from: { r: fr, c: fc }, to: { r: tr, c: tc } };

    currentPlayer = currentPlayer === WHITE ? BLACK : WHITE;
    updateStatus();
    return true;
  }

  function initBoard() {
    board = Array.from({ length: 8 }, () => Array(8).fill(null));

    const backRank = [
      PIECES.R,
      PIECES.N,
      PIECES.B,
      PIECES.Q,
      PIECES.K,
      PIECES.B,
      PIECES.N,
      PIECES.R,
    ];

    for (let c = 0; c < 8; c++) {
      board[7][c] = WHITE + backRank[c];
      board[6][c] = WHITE + PIECES.P;
      board[0][c] = BLACK + backRank[c];
      board[1][c] = BLACK + PIECES.P;
    }

    currentPlayer = WHITE;
    gameOver = false;
    lastMove = null;
    updateStatus();
  }

  function reset() {
    initBoard();
  }

  function getBoard() {
    return cloneBoard(board);
  }

  function getCurrentPlayer() {
    return currentPlayer;
  }

  function getStatus() {
    return { ...status };
  }

  function isGameOver() {
    return gameOver;
  }

  function getLastMove() {
    return lastMove ? { from: { ...lastMove.from }, to: { ...lastMove.to } } : null;
  }

  const api = {
    initBoard,
    reset,
    getBoard,
    getCurrentPlayer,
    getStatus,
    isGameOver,
    getLastMove,
    getLegalMovesForSquare: generateLegalMovesForSquare,
  };

  if (typeof window !== "undefined") {
    window.ChessGame = api;
  }
})();

