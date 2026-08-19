export type PieceColor = "white" | "black";
export type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
export type Square = `${"a"|"b"|"c"|"d"|"e"|"f"|"g"|"h"}${1|2|3|4|5|6|7|8}`;
export type BoardPiece = { square: Square; color: PieceColor; type: PieceType };
export type Threat = { target: BoardPiece; attackers: BoardPiece[]; level: 1|2|3 };

export const PRESSURE_COLORS = {
  black: { 1: "#f39aba", 2: "#dc4b5b", 3: "#8f1d2c" },
  white: { 1: "#78c7ed", 2: "#347fbd", 3: "#173e68" },
} as const;

export const PIECE_ICONS: Record<PieceColor, Record<PieceType, string>> = {
  white: { pawn:"♙", knight:"♘", bishop:"♗", rook:"♖", queen:"♕", king:"♔" },
  black: { pawn:"♟", knight:"♞", bishop:"♝", rook:"♜", queen:"♛", king:"♚" },
};

const files = ["a","b","c","d","e","f","g","h"] as const;

export function parseFen(fen: string): BoardPiece[] {
  const board = fen.trim().split(/\s+/)[0];
  if (!board) throw new Error("Invalid FEN");
  const rows = board.split("/");
  if (rows.length !== 8) throw new Error("Invalid FEN board");

  const pieceTypes: Record<string, PieceType> = {
    p:"pawn", n:"knight", b:"bishop", r:"rook", q:"queen", k:"king",
  };
  const pieces: BoardPiece[] = [];

  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;
    for (const token of row) {
      if (/\d/.test(token)) {
        fileIndex += Number(token);
        continue;
      }
      const lower = token.toLowerCase();
      const type = pieceTypes[lower];
      const file = files[fileIndex];
      if (!type || !file) throw new Error("Invalid FEN piece placement");
      pieces.push({
        square: `${file}${8-rowIndex}` as Square,
        color: token === lower ? "black" : "white",
        type,
      });
      fileIndex++;
    }
    if (fileIndex !== 8) throw new Error("Invalid FEN rank width");
  });
  return pieces;
}

function attacks(from: BoardPiece, to: BoardPiece, occupied: Map<Square, BoardPiece>) {
  const fx = files.indexOf(from.square[0] as typeof files[number]);
  const fy = Number(from.square[1]) - 1;
  const tx = files.indexOf(to.square[0] as typeof files[number]);
  const ty = Number(to.square[1]) - 1;
  const dx = tx-fx;
  const dy = ty-fy;

  if (from.type === "pawn") return Math.abs(dx) === 1 && dy === (from.color === "white" ? 1 : -1);
  if (from.type === "knight") return (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
  if (from.type === "king") return Math.max(Math.abs(dx), Math.abs(dy)) === 1;

  const diagonal = Math.abs(dx) === Math.abs(dy);
  const straight = dx === 0 || dy === 0;
  if (from.type === "bishop" && !diagonal) return false;
  if (from.type === "rook" && !straight) return false;
  if (from.type === "queen" && !diagonal && !straight) return false;

  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  for (let x=fx+stepX,y=fy+stepY; x!==tx||y!==ty; x+=stepX,y+=stepY) {
    const file = files[x];
    if (file && occupied.has(`${file}${y+1}` as Square)) return false;
  }
  return true;
}

export function calculateThreats(pieces: BoardPiece[]): Threat[] {
  const occupied = new Map(pieces.map(piece => [piece.square, piece]));
  return pieces.map(target => {
    const attackers = pieces.filter(piece =>
      piece.color !== target.color && attacks(piece, target, occupied)
    );
    return {
      target,
      attackers,
      level: Math.min(3, attackers.length) as 1|2|3,
    };
  }).filter(threat => threat.attackers.length > 0);
}

export type OverlayAdapter = {
  getPieces(): BoardPiece[];
  getSquareElement(square: Square): HTMLElement | null;
};

export function clearThreatOverlays(root: ParentNode = document) {
  root.querySelectorAll("[data-chesslens-overlay]").forEach(node => node.remove());
}

export function paintThreatOverlays(adapter: OverlayAdapter) {
  clearThreatOverlays();
  const threats = calculateThreats(adapter.getPieces());

  for (const threat of threats) {
    const square = adapter.getSquareElement(threat.target.square);
    if (!square) continue;
    if (getComputedStyle(square).position === "static") square.style.position = "relative";

    const layer = document.createElement("div");
    layer.dataset.chesslensOverlay = "true";
    layer.dataset.level = String(threat.level);
    layer.dataset.targetColor = threat.target.color;
    Object.assign(layer.style, {
      position:"absolute", inset:"0", zIndex:"20", pointerEvents:"none",
      background:PRESSURE_COLORS[threat.target.color][threat.level], opacity:".78",
    });

    const icons = document.createElement("div");
    Object.assign(icons.style, {
      position:"absolute", right:"3px", top:"3px", display:"flex", gap:"2px",
      flexWrap:"wrap", justifyContent:"flex-end", maxWidth:"70%",
    });

    for (const attacker of threat.attackers) {
      const icon = document.createElement("span");
      icon.textContent = PIECE_ICONS[attacker.color][attacker.type];
      icon.title = `${attacker.color} ${attacker.type} from ${attacker.square}`;
      icon.dataset.attackerSquare = attacker.square;
      icon.dataset.attackerPiece = attacker.type;
      Object.assign(icon.style, {
        width:"18px", height:"18px", display:"grid", placeItems:"center",
        borderRadius:"50%", background:"#fff", color:"#17211d",
        border:"1px solid rgba(23,33,29,.35)", boxShadow:"0 1px 3px rgba(0,0,0,.25)",
        fontSize:"13px", lineHeight:"1",
      });
      icons.append(icon);
    }
    layer.append(icons);
    square.append(layer);
  }
  return threats;
}

export function watchBoard(adapter: OverlayAdapter, boardRoot: HTMLElement) {
  let frame = 0;
  const refresh = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => paintThreatOverlays(adapter));
  };
  const observer = new MutationObserver(refresh);
  observer.observe(boardRoot, {
    childList:true, subtree:true, attributes:true,
    attributeFilter:["class","style","data-piece"],
  });
  refresh();

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearThreatOverlays(boardRoot);
  };
}
