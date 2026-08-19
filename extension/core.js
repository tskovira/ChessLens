(() => {
  const FILES = ["a","b","c","d","e","f","g","h"];
  const COLORS = {
    black: { 1:"#f39aba", 2:"#dc4b5b", 3:"#8f1d2c" },
    white: { 1:"#78c7ed", 2:"#347fbd", 3:"#173e68" },
  };
  const ICONS = {
    white: { pawn:"♙", knight:"♘", bishop:"♗", rook:"♖", queen:"♕", king:"♔" },
    black: { pawn:"♟", knight:"♞", bishop:"♝", rook:"♜", queen:"♛", king:"♚" },
  };

  function attacks(from, to, occupied) {
    const fx=FILES.indexOf(from.square[0]), fy=Number(from.square[1])-1;
    const tx=FILES.indexOf(to.square[0]), ty=Number(to.square[1])-1;
    const dx=tx-fx, dy=ty-fy;
    if(from.type==="pawn") return Math.abs(dx)===1&&dy===(from.color==="white"?1:-1);
    if(from.type==="knight") return (Math.abs(dx)===1&&Math.abs(dy)===2)||(Math.abs(dx)===2&&Math.abs(dy)===1);
    if(from.type==="king") return Math.max(Math.abs(dx),Math.abs(dy))===1;
    const diagonal=Math.abs(dx)===Math.abs(dy), straight=dx===0||dy===0;
    if(from.type==="bishop"&&!diagonal) return false;
    if(from.type==="rook"&&!straight) return false;
    if(from.type==="queen"&&!diagonal&&!straight) return false;
    const sx=Math.sign(dx), sy=Math.sign(dy);
    for(let x=fx+sx,y=fy+sy;x!==tx||y!==ty;x+=sx,y+=sy){
      if(occupied.has(`${FILES[x]}${y+1}`)) return false;
    }
    return true;
  }

  function calculateThreats(pieces) {
    const occupied=new Map(pieces.map(piece=>[piece.square,piece]));
    return pieces.map(target=>{
      const attackers=pieces.filter(piece=>piece.color!==target.color&&attacks(piece,target,occupied));
      return {target,attackers,level:Math.min(3,attackers.length)};
    }).filter(threat=>threat.attackers.length);
  }

  function squarePosition(square, orientation) {
    const file=FILES.indexOf(square[0]), rank=Number(square[1])-1;
    return orientation==="black"
      ? {left:(7-file)*12.5,top:rank*12.5}
      : {left:file*12.5,top:(7-rank)*12.5};
  }

  function render(adapter) {
    const board=adapter.board();
    if(!board) return [];
    board.querySelector("[data-chesslens-root]")?.remove();
    const threats=calculateThreats(adapter.pieces());
    const root=document.createElement("div");
    root.dataset.chesslensRoot="true";
    root.setAttribute("aria-hidden","true");

    for(const threat of threats){
      const position=squarePosition(threat.target.square,adapter.orientation());
      const overlay=document.createElement("div");
      overlay.className="chesslens-square";
      overlay.dataset.level=String(threat.level);
      overlay.dataset.target=threat.target.square;
      Object.assign(overlay.style,{
        left:`${position.left}%`,top:`${position.top}%`,
        background:COLORS[threat.target.color][threat.level],
      });
      const icons=document.createElement("div");
      icons.className="chesslens-icons";
      for(const attacker of threat.attackers){
        const icon=document.createElement("span");
        icon.textContent=ICONS[attacker.color][attacker.type];
        icon.title=`${attacker.color} ${attacker.type} from ${attacker.square}`;
        icon.dataset.attackerSquare=attacker.square;
        icon.dataset.attackerPiece=attacker.type;
        icons.append(icon);
      }
      overlay.append(icons);
      root.append(overlay);
    }
    board.append(root);
    return threats;
  }

  window.ChessLensCore={calculateThreats,render,COLORS,ICONS};
})();
