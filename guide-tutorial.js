(()=>{
'use strict';

// Page-local state; no account data, storage, or cloud writes.
let session=null, dialog=null, routeObserver=null, sequence=0, finishClosing=null, companionCleanup=null;
const guideById=id=>globalThis.ARCHIVE_DATA?.guides?.guides?.find(g=>g.id===id);
const onGuides=()=>location.hash.split('/')[1]==='guides';

function addPilotCompanion(ownedDialog){
  const step=ownedDialog.querySelector('.rf-tutorial-step');
  const copy=document.createElement('div');copy.className='rf-tutorial-copy';
  copy.append(...step.childNodes);
  const companion=document.createElement('div');
  companion.className='rf-tutorial-companion';
  companion.setAttribute('aria-hidden','true');
  companion.innerHTML='<div class="rf-tutorial-companion-arrival"><div class="rf-tutorial-companion-turn"><img src="./assets/live-map/by-the-wind.png" alt="" draggable="false"></div></div>';
  step.classList.add('rf-tutorial-with-companion');step.append(copy,companion);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const staticEntry=()=>{
    if(!motion.matches)return;
    companion.classList.add('is-static-entry');
    if(dialog!==ownedDialog)finishClosing?.();
  };
  staticEntry();motion.addEventListener('change',staticEntry);
  companionCleanup=()=>motion.removeEventListener('change',staticEntry);
  companion.querySelector('img').decode().then(()=>{
    if(dialog===ownedDialog&&session?.open)companion.classList.add('is-ready');
  }).catch(()=>{
    companion.remove();step.classList.remove('rf-tutorial-with-companion');
  });
}

function updateStep(){
  if(!session?.open||!dialog)return;
  const chapter=guideById(session.guideId).chapters[session.stepIndex];
  dialog.querySelector('[data-tutorial-chapter]').textContent=chapter.title;
  dialog.querySelector('[data-tutorial-text]').textContent=chapter.text;
  dialog.querySelector('[data-tutorial-progress]').textContent=`${session.stepIndex+1} / ${session.totalSteps}`;
  const previous=dialog.querySelector('[data-tutorial-previous]');
  previous.disabled=session.stepIndex===0;
  dialog.querySelector('[data-tutorial-next]').textContent=session.stepIndex===session.totalSteps-1?'TUTORIAL ABSCHLIESSEN':'WEITER';
  const companion=dialog.querySelector('.rf-tutorial-companion');
  if(companion){
    companion.style.setProperty('--companion-turn',`${[-3,1,-1,3,0][session.stepIndex]}deg`);
    companion.style.setProperty('--companion-depth',`${[0,5,2,6,0][session.stepIndex]}px`);
    companion.style.setProperty('--companion-shift',`${[0,-2,1,-1,0][session.stepIndex]}px`);
  }
  if(previous.disabled&&document.activeElement===previous)dialog.querySelector('[data-tutorial-chapter]').focus();
}

function close(completed=false,restoreFocus=true){
  if(!session?.open)return false;
  session.open=false;
  session.completed=completed;
  const closed=dialog;dialog=null;
  const cleanupCompanion=companionCleanup;companionCleanup=null;
  routeObserver?.disconnect();routeObserver=null;
  window.removeEventListener('hashchange',leaveGuides);
  const guideId=session.guideId;
  let timer=0,finished=false;
  const finish=()=>{
    if(finished)return;
    finished=true;clearTimeout(timer);finishClosing=null;cleanupCompanion?.();
    closed.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    closed.close();closed.remove();
    if(restoreFocus&&onGuides()){
      const start=[...document.querySelectorAll('[data-tutorial-start]')].find(b=>b.dataset.tutorialStart===guideId);
      (start||document.querySelector('#guideSearch'))?.focus();
    }
  };
  finishClosing=finish;
  const companion=closed.querySelector('.rf-tutorial-companion.is-ready');
  if(companion&&restoreFocus&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    closed.classList.add('rf-tutorial-closing');
    const arrival=companion.querySelector('.rf-tutorial-companion-arrival');
    const current=getComputedStyle(arrival);
    const exit=arrival.animate([
      {opacity:current.opacity,transform:current.transform},
      {opacity:0,transform:'translate3d(8px,9px,-60px) rotateY(4deg) scale(.88)'}
    ],{duration:260,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
    exit.finished.then(finish,finish);
    timer=setTimeout(finish,340);
  }else finish();
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
  finishClosing?.();
  session={id:++sequence,guideId,stepIndex:0,totalSteps:guide.chapters.length,open:true,completed:false};
  dialog=document.createElement('dialog');
  dialog.className='rf-tutorial';
  dialog.setAttribute('aria-labelledby','tutorialGuideTitle');
  dialog.innerHTML=`<header class="rf-tutorial-head"><h2 id="tutorialGuideTitle"></h2><button class="ghost-btn" type="button" data-tutorial-close>SCHLIESSEN</button></header>
    <section class="rf-tutorial-step" aria-live="polite" aria-atomic="true"><h3 data-tutorial-chapter tabindex="-1"></h3><p data-tutorial-text></p></section>
    <footer class="rf-tutorial-controls"><button class="ghost-btn" type="button" data-tutorial-previous>ZURÜCK</button><span data-tutorial-progress aria-label="Schrittfortschritt"></span><button class="cyan-btn compact" type="button" data-tutorial-next>WEITER</button></footer>`;
  dialog.querySelector('h2').textContent=guide.title;
  if(guideId==='g-start')addPilotCompanion(dialog);
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
