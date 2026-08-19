(() => {
  const TYPE_CODES={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
  const ALLOWED_CHESS_COM=[
    /^\/analysis(?:\/|$)/,
    /^\/game\/computer(?:\/|$)/,
    /^\/play\/computer(?:\/|$)/,
    /^\/puzzles?(?:\/|$)/,
    /^\/practice(?:\/|$)/,
    /^\/lessons?(?:\/|$)/,
  ];
  const ALLOWED_LICHESS=[
    /^\/analysis(?:\/|$)/,
    /^\/training(?:\/|$)/,
    /^\/study(?:\/|$)/,
    /^\/practice(?:\/|$)/,
    /^\/editor(?:\/|$)/,
  ];

  function chessComPieces(board){
    const pieces=[];
    board.querySelectorAll(".piece").forEach(element=>{
      const classes=[...element.classList];
      const code=classes.find(name=>/^[wb][prnbqk]$/.test(name));
      const squareClass=classes.find(name=>/^square-[1-8][1-8]$/.test(name));
      if(!code||!squareClass) return;
      const file=Number(squareClass[7]), rank=Number(squareClass[8]);
      pieces.push({
        square:`${"abcdefgh"[file-1]}${rank}`,
        color:code[0]==="w"?"white":"black",
        type:TYPE_CODES[code[1]],
      });
    });
    return pieces;
  }

  const chessCom={
    id:"chess.com",
    allowed:()=>ALLOWED_CHESS_COM.some(pattern=>pattern.test(location.pathname)),
    board:()=>document.querySelector("wc-chess-board, chess-board"),
    orientation(){
      const board=this.board();
      return board?.classList.contains("flipped")||board?.getAttribute("data-board-flipped")==="true"?"black":"white";
    },
    pieces(){const board=this.board();return board?chessComPieces(board):[];},
  };

  function lichessPiece(element,board){
    const rect=board.getBoundingClientRect();
    const style=getComputedStyle(element);
    const matrix=new DOMMatrixReadOnly(style.transform);
    const tile=rect.width/8;
    const x=Math.round(matrix.m41/tile), y=Math.round(matrix.m42/tile);
    const black=board.closest(".orientation-black")!==null;
    const file=black?7-x:x, rank=black?y:7-y;
    const type=Object.values(TYPE_CODES).find(name=>element.classList.contains(name));
    const color=element.classList.contains("white")?"white":element.classList.contains("black")?"black":null;
    if(!type||!color||file<0||file>7||rank<0||rank>7) return null;
    return {square:`${"abcdefgh"[file]}${rank+1}`,color,type};
  }

  const lichess={
    id:"lichess.org",
    allowed:()=>ALLOWED_LICHESS.some(pattern=>pattern.test(location.pathname)),
    board:()=>document.querySelector("cg-board"),
    orientation(){return this.board()?.closest(".orientation-black")?"black":"white";},
    pieces(){
      const board=this.board();
      if(!board) return [];
      return [...board.querySelectorAll("piece")].map(piece=>lichessPiece(piece,board)).filter(Boolean);
    },
  };

  window.ChessLensAdapters={
    current(){
      if(location.hostname==="www.chess.com") return chessCom;
      if(location.hostname==="lichess.org") return lichess;
      return null;
    },
  };
})();
