(() => {
  const FILES=["a","b","c","d","e","f","g","h"];
  const COLORS={
    black:{1:"#f39aba",2:"#dc4b5b",3:"#8f1d2c"},
    white:{1:"#78c7ed",2:"#347fbd",3:"#173e68"},
  };
  const ICONS={
    white:{pawn:"♙",knight:"♘",bishop:"♗",rook:"♖",queen:"♕",king:"♔"},
    black:{pawn:"♟",knight:"♞",bishop:"♝",rook:"♜",queen:"♛",king:"♚"},
  };

  function attacks(from,to,occupied){
    const fx=FILES.indexOf(from.square[0]),fy=Number(from.square[1])-1;
    const tx=FILES.indexOf(to.square[0]),ty=Number(to.square[1])-1;
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
      if(occupied.has(`${FILES[x]}${y+1}`)) return false;
    }
    return true;
  }

  function afterCapture(pieces,from,target){
    return pieces
      .filter(piece=>piece.square!==from.square&&piece.square!==target.square)
      .concat({...from,square:target.square});
  }

  function kingIsSafe(pieces,color){
    const king=pieces.find(piece=>piece.color===color&&piece.type==="king");
    if(!king) return true;
    const occupied=new Map(pieces.map(piece=>[piece.square,piece]));
    return !pieces.some(piece=>piece.color!==color&&attacks(piece,king,occupied));
  }

  function legalCapture(pieces,from,target){
    const occupied=new Map(pieces.map(piece=>[piece.square,piece]));
    if(!attacks(from,target,occupied)) return false;
    return kingIsSafe(afterCapture(pieces,from,target),from.color);
  }

  function legalAttackers(pieces,target){
    return pieces.filter(piece=>piece.color!==target.color&&legalCapture(pieces,piece,target));
  }

  function usableDefenders(pieces,target,attackers){
    const candidates=pieces.filter(piece=>piece.color===target.color&&piece.square!==target.square);
    return candidates.filter(defender=>attackers.some(attacker=>{
      const afterAttack=afterCapture(pieces,attacker,target);
      const capturedAttacker={...attacker,square:target.square};
      const movedDefender=afterAttack.find(piece=>piece.square===defender.square);
      return Boolean(movedDefender&&legalCapture(afterAttack,movedDefender,capturedAttacker));
    }));
  }

  function calculateThreats(pieces){
    return pieces.map(target=>{
      const attackers=legalAttackers(pieces,target);
      const defenders=attackers.length?usableDefenders(pieces,target,attackers):[];
      return {target,attackers,defenders,level:Math.min(3,attackers.length)};
    }).filter(threat=>threat.attackers.length);
  }

  function squarePosition(square,orientation){
    const file=FILES.indexOf(square[0]),rank=Number(square[1])-1;
    return orientation==="black"
      ?{left:(7-file)*12.5,top:rank*12.5}
      :{left:file*12.5,top:(7-rank)*12.5};
  }

  function clearGuide(root){
    root.querySelectorAll("[data-chesslens-guide]").forEach(node=>node.remove());
  }

  function showGuide(root,from,to,orientation,kind){
    clearGuide(root);
    const source=squarePosition(from,orientation),target=squarePosition(to,orientation);
    const sourceX=source.left+6.25,sourceY=source.top+6.25;
    const targetX=target.left+6.25,targetY=target.top+6.25;
    const dx=targetX-sourceX,dy=targetY-sourceY;
    const outline=document.createElement("div");
    outline.dataset.chesslensGuide="true";
    outline.className=`chesslens-source chesslens-${kind}`;
    Object.assign(outline.style,{left:`${source.left}%`,top:`${source.top}%`});
    const line=document.createElement("div");
    line.dataset.chesslensGuide="true";
    line.className=`chesslens-line chesslens-${kind}`;
    Object.assign(line.style,{
      left:`${sourceX}%`,top:`${sourceY}%`,
      width:`${Math.hypot(dx,dy)}%`,
      transform:`rotate(${Math.atan2(dy,dx)}rad)`,
    });
    root.append(line,outline);
  }

  function pieceBadge(piece,target,root,orientation,kind){
    const icon=document.createElement("span");
    icon.textContent=ICONS[piece.color][piece.type];
    icon.dataset.attackerSquare=kind==="attack"?piece.square:undefined;
    icon.dataset.defenderSquare=kind==="defense"?piece.square:undefined;
    icon.dataset.piece=piece.type;
    const verb=kind==="attack"?"Attacked":"Defended";
    icon.setAttribute("aria-label",`${verb} by ${piece.color} ${piece.type} from ${piece.square}`);
    icon.title=`${verb} by ${piece.type} from ${piece.square}`;
    icon.addEventListener("mouseenter",()=>showGuide(root,piece.square,target.square,orientation,kind));
    icon.addEventListener("mouseleave",()=>clearGuide(root));
    return icon;
  }

  function render(adapter){
    const board=adapter.board();
    if(!board) return [];
    board.querySelector("[data-chesslens-root]")?.remove();
    const threats=calculateThreats(adapter.pieces());
    const orientation=adapter.orientation();
    const root=document.createElement("div");
    root.dataset.chesslensRoot="true";
    root.setAttribute("aria-hidden","false");

    for(const threat of threats){
      const position=squarePosition(threat.target.square,orientation);
      const overlay=document.createElement("div");
      overlay.className="chesslens-square";
      overlay.dataset.level=String(threat.level);
      overlay.dataset.target=threat.target.square;
      Object.assign(overlay.style,{
        left:`${position.left}%`,top:`${position.top}%`,
        background:COLORS[threat.target.color][threat.level],
      });

      const attackers=document.createElement("div");
      attackers.className="chesslens-icons chesslens-attackers";
      for(const attacker of threat.attackers){
        attackers.append(pieceBadge(attacker,threat.target,root,orientation,"attack"));
      }
      overlay.append(attackers);

      if(threat.defenders.length){
        const defenders=document.createElement("div");
        defenders.className="chesslens-defenders";
        const label=document.createElement("b");
        label.textContent="DEF";
        label.title=`${threat.defenders.length} usable defender${threat.defenders.length===1?"":"s"}`;
        defenders.append(label);
        for(const defender of threat.defenders){
          defenders.append(pieceBadge(defender,threat.target,root,orientation,"defense"));
        }
        overlay.append(defenders);
      }
      root.append(overlay);
    }
    board.append(root);
    return threats;
  }

  window.ChessLensCore={calculateThreats,render,COLORS,ICONS};
})();
