const enabled=document.querySelector("#enabled");
const statusText=document.querySelector("#status");
const detail=document.querySelector("#detail");
const dot=document.querySelector("#dot");

chrome.storage.sync.get({enabled:true},settings=>{enabled.checked=settings.enabled;});
enabled.addEventListener("change",()=>chrome.storage.sync.set({enabled:enabled.checked}));

chrome.storage.local.get("chesslensStatus",result=>{
  const state=result.chesslensStatus||{status:"waiting",detail:"Open a supported chess page"};
  statusText.textContent=state.status;
  detail.textContent=state.detail;
  dot.className=state.status;
});
