import type {
  BoardPiece,
  OverlayAdapter,
  PieceColor,
  PieceType,
  Square,
} from "./threat-engine.js";

export type DomBoardConfig = {
  board: HTMLElement;
  squareSelector: (square: Square) => string;
  readPiece: (element: Element) => {
    color: PieceColor;
    type: PieceType;
  } | null;
};

export function createDomBoardAdapter(config: DomBoardConfig): OverlayAdapter {
  return {
    getSquareElement(square) {
      return config.board.querySelector<HTMLElement>(config.squareSelector(square));
    },
    getPieces() {
      const pieces: BoardPiece[] = [];
      for (const file of "abcdefgh") {
        for (let rank=1; rank<=8; rank++) {
          const square = `${file}${rank}` as Square;
          const element = config.board.querySelector(config.squareSelector(square));
          if (!element) continue;
          const piece = config.readPiece(element);
          if (piece) pieces.push({ square, ...piece });
        }
      }
      return pieces;
    },
  };
}
