(() => {
  let activeBoard=null;
  let boardObserver=null;
  let pageObserver=null;
  let frame=0;
  let lastUrl=location.href;

  function setStatus(status,detail=""){
    chrome.storage.local.set({chesslensStatus:{status,detail,host:location.hostname,updatedAt:Date.now()}});
  }

  function stopBoard(){
    boardObserver?.disconnect();
    boardObserver=null;
    activeBoard?.querySelector("[data-chesslens-root]")?.remove();
    activeBoard=null;
  }

  function repaint(adapter){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      if(activeBoard&&document.contains(activeBoard)) {
        const threats=window.ChessLensCore.render(adapter);
        setStatus("active",`${threats.length} threatened pieces`);
      } else {
        scan();
      }
    });
  }

  async function scan(){
    const settings=await chrome.storage.sync.get({enabled:true});
    if(!settings.enabled){stopBoard();setStatus("off","Disabled in settings");return;}
    const adapter=window.ChessLensAdapters.current();
    if(!adapter){stopBoard();setStatus("unsupported","No adapter for this website");return;}
    if(!adapter.allowed()){stopBoard();setStatus("blocked","Unavailable during live human games");return;}
    const board=adapter.board();
    if(!board){stopBoard();setStatus("waiting","Waiting for a supported chessboard");return;}
    if(board===activeBoard){repaint(adapter);return;}

    stopBoard();
    activeBoard=board;
    if(getComputedStyle(board).position==="static") board.style.position="relative";
    repaint(adapter);
    boardObserver=new MutationObserver(()=>repaint(adapter));
    boardObserver.observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
  }

  function watchPage(){
    pageObserver=new MutationObserver(()=>{
      if(location.href!==lastUrl){lastUrl=location.href;stopBoard();}
      scan();
    });
    pageObserver.observe(document.documentElement,{childList:true,subtree:true});
    scan();
  }

  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="sync"&&changes.enabled) scan();
  });
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",watchPage,{once:true});
  else watchPage();
})();
