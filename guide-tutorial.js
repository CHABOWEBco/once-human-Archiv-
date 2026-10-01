(()=>{
'use strict';

// Page-local state; no account data, storage, or cloud writes.
let session=null, dialog=null, routeObserver=null, sequence=0;
const guideById=id=>globalThis.ARCHIVE_DATA?.guides?.guides?.find(g=>g.id===id);
const onGuides=()=>location.hash.split('/')[1]==='guides';

function updateStep(){
  if(!session?.open||!dialog)return;
  const chapter=guideById(session.guideId).chapters[session.stepIndex];
  dialog.querySelector('[data-tutorial-chapter]').textContent=chapter.title;
  dialog.querySelector('[data-tutorial-text]').textContent=chapter.text;
  dialog.querySelector('[data-tutorial-progress]').textContent=`${session.stepIndex+1} / ${session.totalSteps}`;
  const previous=dialog.querySelector('[data-tutorial-previous]');
  previous.disabled=session.stepIndex===0;
  dialog.querySelector('[data-tutorial-next]').textContent=session.stepIndex===session.totalSteps-1?'TUTORIAL ABSCHLIESSEN':'WEITER';
  if(previous.disabled&&document.activeElement===previous)dialog.querySelector('[data-tutorial-chapter]').focus();
}

function close(completed=false,restoreFocus=true){
  if(!session?.open)return false;
  session.open=false;
  session.completed=completed;
  const closed=dialog;dialog=null;
  routeObserver?.disconnect();routeObserver=null;
  closed.close();closed.remove();
  window.removeEventListener('hashchange',leaveGuides);
  if(restoreFocus&&onGuides()){
    const start=[...document.querySelectorAll('[data-tutorial-start]')].find(b=>b.dataset.tutorialStart===session.guideId);
    (start||document.querySelector('#guideSearch'))?.focus();
  }
  return true;
}

function leaveGuides(){if(!onGuides())close(false,false)}
function previous(){
  if(!session?.open||session.stepIndex===0)return false;
  session.stepIndex--;updateStep();return true;
}
function next(){
  if(!session?.open||session.stepIndex>=session.totalSteps-1)return false;
  session.stepIndex++;updateStep();return true;
}
function complete(){
  if(!session?.open||session.stepIndex!==session.totalSteps-1)return false;
  return close(true);
}

function start(guideId){
  if(session?.open)return false;
  const guide=guideById(guideId);
  if(!onGuides()||!guide?.chapters?.length)return false;
  session={id:++sequence,guideId,stepIndex:0,totalSteps:guide.chapters.length,open:true,completed:false};
  dialog=document.createElement('dialog');
  dialog.className='rf-tutorial';
  dialog.setAttribute('aria-labelledby','tutorialGuideTitle');
  dialog.innerHTML=`<header class="rf-tutorial-head"><h2 id="tutorialGuideTitle"></h2><button class="ghost-btn" type="button" data-tutorial-close>SCHLIESSEN</button></header>
    <section class="rf-tutorial-step" aria-live="polite" aria-atomic="true"><h3 data-tutorial-chapter tabindex="-1"></h3><p data-tutorial-text></p></section>
    <footer class="rf-tutorial-controls"><button class="ghost-btn" type="button" data-tutorial-previous>ZURÜCK</button><span data-tutorial-progress aria-label="Schrittfortschritt"></span><button class="cyan-btn compact" type="button" data-tutorial-next>WEITER</button></footer>`;
  dialog.querySelector('h2').textContent=guide.title;
  dialog.querySelector('[data-tutorial-close]').onclick=()=>close();
  dialog.querySelector('[data-tutorial-previous]').onclick=previous;
  dialog.querySelector('[data-tutorial-next]').onclick=()=>session.stepIndex===session.totalSteps-1?complete():next();
  dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
  const ownedDialog=dialog;
  dialog.addEventListener('close',()=>{if(dialog===ownedDialog)close()});
  // Keep the node outside #app; ordinary guide renders cannot reset this session.
  document.body.append(dialog);updateStep();dialog.showModal();
  dialog.querySelector('[data-tutorial-chapter]').focus();
  window.addEventListener('hashchange',leaveGuides);
  // Auth/alias routing also uses replaceState, which emits no hashchange.
  routeObserver=new MutationObserver(leaveGuides);
  routeObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  return true;
}

globalThis.JMA_TUTORIAL=Object.freeze({start,previous,next,complete,close:()=>close(),getState:()=>session?{...session}:null});
})();
