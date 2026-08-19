export type PieceColor = "white" | "black";
export type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
export type Square = `${"a"|"b"|"c"|"d"|"e"|"f"|"g"|"h"}${1|2|3|4|5|6|7|8}`;
export type BoardPiece = { square: Square; color: PieceColor; type: PieceType };
export type Threat = {
  target: BoardPiece;
  attackers: BoardPiece[];
  defenders: BoardPiece[];
  level: 1|2|3;
};

export const PRESSURE_COLORS = {
  black: { 1:"#f39aba", 2:"#dc4b5b", 3:"#8f1d2c" },
  white: { 1:"#78c7ed", 2:"#347fbd", 3:"#173e68" },
} as const;

export const PIECE_ICONS: Record<PieceColor,Record<PieceType,string>> = {
  white:{pawn:"♙",knight:"♘",bishop:"♗",rook:"♖",queen:"♕",king:"♔"},
  black:{pawn:"♟",knight:"♞",bishop:"♝",rook:"♜",queen:"♛",king:"♚"},
};

const files=["a","b","c","d","e","f","g","h"] as const;

export function parseFen(fen:string):BoardPiece[]{
  const board=fen.trim().split(/\s+/)[0];
  if(!board) throw new Error("Invalid FEN");
  const rows=board.split("/");
  if(rows.length!==8) throw new Error("Invalid FEN board");
  const types:Record<string,PieceType>={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
  const pieces:BoardPiece[]=[];
  rows.forEach((row,rowIndex)=>{
    let fileIndex=0;
    for(const token of row){
      if(/\d/.test(token)){fileIndex+=Number(token);continue;}
      const lower=token.toLowerCase();
      const type=types[lower],file=files[fileIndex];
      if(!type||!file) throw new Error("Invalid FEN piece placement");
      pieces.push({
        square:`${file}${8-rowIndex}` as Square,
        color:token===lower?"black":"white",
        type,
      });
      fileIndex++;
    }
    if(fileIndex!==8) throw new Error("Invalid FEN rank width");
  });
  return pieces;
}

function attacks(from:BoardPiece,to:BoardPiece,occupied:Map<Square,BoardPiece>){
  const fx=files.indexOf(from.square[0] as typeof files[number]),fy=Number(from.square[1])-1;
  const tx=files.indexOf(to.square[0] as typeof files[number]),ty=Number(to.square[1])-1;
  const dx=tx-fx,dy=ty-fy;
  if(from.type==="pawn") return Math.abs(dx)===1&&dy===(from.color==="white"?1:-1);
  if(from.type==="knight") return (Math.abs(dx)===1&&Math.abs(dy)===2)||(Math.abs(dx)===2&&Math.abs(dy)===1);
  if(from.type==="king") return Math.max(Math.abs(dx),Math.abs(dy))===1;
  const diagonal=Math.abs(dx)===Math.abs(dy),straight=dx===0||dy===0;
  if(from.type==="bishop"&&!diagonal) return false;
  if(from.type==="rook"&&!straight) return false;
  if(from.type==="queen"&&!diagonal&&!straight) return false;
  const sx=Math.sign(dx),sy=Math.sign(dy);
  for(let x=fx+sx,y=fy+sy;x!==tx||y!==ty;x+=sx,y+=sy){
    const file=files[x];
    if(file&&occupied.has(`${file}${y+1}` as Square)) return false;
  }
  return true;
}

function afterCapture(pieces:BoardPiece[],from:BoardPiece,target:BoardPiece):BoardPiece[]{
  return pieces
    .filter(piece=>piece.square!==from.square&&piece.square!==target.square)
    .concat({...from,square:target.square});
}

function kingIsSafe(pieces:BoardPiece[],color:PieceColor){
  const king=pieces.find(piece=>piece.color===color&&piece.type==="king");
  if(!king) return true;
  const occupied=new Map(pieces.map(piece=>[piece.square,piece]));
  return !pieces.some(piece=>piece.color!==color&&attacks(piece,king,occupied));
}

function legalCapture(pieces:BoardPiece[],from:BoardPiece,target:BoardPiece){
  const occupied=new Map(pieces.map(piece=>[piece.square,piece]));
  return attacks(from,target,occupied)&&kingIsSafe(afterCapture(pieces,from,target),from.color);
}

function usableDefenders(pieces:BoardPiece[],target:BoardPiece,attackers:BoardPiece[]){
  const candidates=pieces.filter(piece=>piece.color===target.color&&piece.square!==target.square);
  return candidates.filter(defender=>attackers.some(attacker=>{
    const afterAttack=afterCapture(pieces,attacker,target);
    const capturedAttacker={...attacker,square:target.square};
    const movedDefender=afterAttack.find(piece=>piece.square===defender.square);
    return Boolean(movedDefender&&legalCapture(afterAttack,movedDefender,capturedAttacker));
  }));
}

export function calculateThreats(pieces:BoardPiece[]):Threat[]{
  return pieces.map(target=>{
    const attackers=pieces.filter(piece=>piece.color!==target.color&&legalCapture(pieces,piece,target));
    const defenders=attackers.length?usableDefenders(pieces,target,attackers):[];
    return {target,attackers,defenders,level:Math.min(3,attackers.length) as 1|2|3};
  }).filter(threat=>threat.attackers.length>0);
}

export type OverlayAdapter={
  getPieces():BoardPiece[];
  getSquareElement(square:Square):HTMLElement|null;
};

export function clearThreatOverlays(root:ParentNode=document){
  root.querySelectorAll("[data-chesslens-overlay]").forEach(node=>node.remove());
}

function badge(piece:BoardPiece,kind:"attacker"|"defender"){
  const icon=document.createElement("span");
  icon.textContent=PIECE_ICONS[piece.color][piece.type];
  icon.title=`${kind==="attacker"?"Attacked":"Defended"} by ${piece.type} from ${piece.square}`;
  icon.dataset.piece=piece.type;
  icon.dataset.sourceSquare=piece.square;
  Object.assign(icon.style,{
    width:"18px",height:"18px",display:"grid",placeItems:"center",borderRadius:"50%",
    background:"#fff",color:"#17211d",border:"1px solid rgba(23,33,29,.35)",
    boxShadow:"0 1px 3px rgba(0,0,0,.25)",fontSize:"13px",lineHeight:"1",
  });
  return icon;
}

export function paintThreatOverlays(adapter:OverlayAdapter){
  clearThreatOverlays();
  const threats=calculateThreats(adapter.getPieces());
  for(const threat of threats){
    const square=adapter.getSquareElement(threat.target.square);
    if(!square) continue;
    if(getComputedStyle(square).position==="static") square.style.position="relative";
    const layer=document.createElement("div");
    layer.dataset.chesslensOverlay="true";
    layer.dataset.level=String(threat.level);
    Object.assign(layer.style,{
      position:"absolute",inset:"0",zIndex:"20",pointerEvents:"none",
      background:PRESSURE_COLORS[threat.target.color][threat.level],opacity:".78",
    });
    const attackers=document.createElement("div");
    Object.assign(attackers.style,{
      position:"absolute",right:"3px",top:"3px",display:"flex",gap:"2px",
      flexWrap:"wrap",justifyContent:"flex-end",maxWidth:"70%",
    });
    threat.attackers.forEach(piece=>attackers.append(badge(piece,"attacker")));
    layer.append(attackers);
    if(threat.defenders.length){
      const defenders=document.createElement("div");
      Object.assign(defenders.style,{
        position:"absolute",left:"3px",bottom:"3px",display:"flex",alignItems:"center",
        gap:"2px",padding:"2px 3px",borderRadius:"5px",background:"rgba(23,33,29,.82)",
      });
      const label=document.createElement("b");
      label.textContent="DEF";
      Object.assign(label.style,{color:"#fff",fontSize:"7px",letterSpacing:".05em"});
      defenders.append(label);
      threat.defenders.forEach(piece=>defenders.append(badge(piece,"defender")));
      layer.append(defenders);
    }
    square.append(layer);
  }
  return threats;
}

export function watchBoard(adapter:OverlayAdapter,boardRoot:HTMLElement){
  let frame=0;
  const refresh=()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>paintThreatOverlays(adapter));
  };
  const observer=new MutationObserver(refresh);
  observer.observe(boardRoot,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style","data-piece"]});
  refresh();
  return ()=>{observer.disconnect();cancelAnimationFrame(frame);clearThreatOverlays(boardRoot);};
}
