# ChessLens

ChessLens is a board-agnostic TypeScript engine for visualizing pressure on chess pieces.

It calculates which occupied squares are attacked, assigns a three-level color scale, and renders a small icon for every attacking piece. The engine does not own or render a chessboard. A lightweight adapter connects it to any compatible board interface.

## Pressure scale

| Target | 1 attacker | 2 attackers | 3+ attackers |
|---|---|---|---|
| Black piece | Pink | Red | Dark red |
| White piece | Light blue | Blue | Dark blue |

Each highlighted square displays miniature icons representing the pieces attacking it. For example, a black pawn on `f7` attacked by a white knight receives a pink overlay with a knight badge.

## Features

- Board-independent threat calculation
- FEN piece-placement parser
- Sliding-piece blocker detection
- Three pressure levels per side
- Individual attacker-piece badges
- DOM overlay renderer
- MutationObserver-based automatic refresh
- Adapter interface for different chessboard implementations
- No chess engine or move recommendations

## Install

```bash
npm install
```

## Usage

```ts
import {
  createDomBoardAdapter,
  paintThreatOverlays,
  watchBoard,
} from "chesslens";

const adapter = createDomBoardAdapter({
  board: document.querySelector(".your-board")!,
  squareSelector: (square) => `[data-square="${square}"]`,
  readPiece(element) {
    const piece = element.querySelector("[data-piece]")?.getAttribute("data-piece");
    if (!piece) return null;

    const [color, type] = piece.split("-");
    return {
      color: color as "white" | "black",
      type: type as "pawn" | "knight" | "bishop" | "rook" | "queen" | "king",
    };
  },
});

paintThreatOverlays(adapter);

// Repaint automatically whenever the board changes.
const stopWatching = watchBoard(adapter, document.querySelector(".your-board")!);

// Later:
// stopWatching();
```

## Core API

### `calculateThreats(pieces)`

Returns each attacked piece, all of its attackers, and its pressure level.

### `paintThreatOverlays(adapter)`

Calculates threats and adds colored overlays and attacker icons to the board supplied by an adapter.

### `watchBoard(adapter, boardRoot)`

Observes board changes and refreshes the overlays after each move. It returns a cleanup function.

### `createDomBoardAdapter(config)`

Connects ChessLens to a DOM-based chessboard without placing website-specific selectors inside the core engine.

## Development

```bash
npm test
npm run typecheck
npm run build
```

## Responsible use

ChessLens is intended for computer opponents, puzzles, analysis, post-game review, studies, and chessboards you own or control. Do not use real-time assistance where it violates a chess platform's fair-play rules.
