# ChessLens

ChessLens is a board TypeScript engine and Chrome extension for visualizing pressure on chess pieces.

It calculates which occupied squares are attacked, assigns a three-level color scale, and renders a small icon for every attacking piece. 

## Pressure scale

| Target | 1 attacker | 2 attackers | 3+ attackers |
|---|---|---|---|
| Black piece | Pink | Red | Dark red |
| White piece | Light blue | Blue | Dark blue |

Each highlighted square displays miniature icons representing the pieces attacking it. For example, id a black piece is attacked by a white knight, it receives a pink overlay with a knight icon.

## Features

- Board-independent threat calculation
- FEN piece-placement parser
- Sliding-piece blocker detection
- Three pressure levels per side
- Individual attacker-piece badges
- DOM overlay renderer
- MutationObserver-based automatic refresh
- Adapter interface for different chessboard implementations
- Loadable Chrome Manifest V3 extension
- Chess.com and Lichess adapter foundations
- Automatic fair-play page restrictions
- No chess engine or move recommendations

## Install the Chrome extension

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository's `extension` folder.
6. Pin ChessLens from Chrome's Extensions menu.

ChessLens starts automatically on supported Chess.com and Lichess pages. Open its toolbar popup to enable or disable overlays and see whether it is active, waiting for a board, unsupported, or blocked.

The extension currently activates on recognized analysis, computer, puzzle, practice, lesson, study, training, and board-editor routes. It remains disabled on live human-game routes.

## Use the TypeScript engine

```bash
npm install
```

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
const stopWatching = watchBoard(adapter, document.querySelector(".your-board")!);

// Later:
// stopWatching();
```

## Project structure

```text
ChessLens/
├── extension/             # Loadable Chrome extension
│   ├── manifest.json
│   ├── core.js
│   ├── adapters.js
│   ├── content.js
│   ├── overlay.css
│   └── popup.*
├── src/                   # Reusable TypeScript package
├── tests/                 # Threat calculation tests
├── package.json
└── tsconfig.json
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


## Responsible use

ChessLens is intended for computer opponents, puzzles, analysis, post-game review, studies, and chessboards you own or control. Do not use real-time assistance where it violates a chess platform's fair-play rules.
