(()=>{
'use strict';

const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f=null)=>globalThis.JMA_STORE?.read?.(k,f)??f;
const write=(k,v)=>globalThis.JMA_STORE?.write?.(k,v);
const arr=k=>{const v=read(k,[]);return Array.isArray(v)?v:[]};
const AD=()=>globalThis.ARCHIVE_DATA||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const customMarkers=()=>arr('jma_custom_markers');
const allMarkers=()=>[...(AD().map?.markers||[]),...customMarkers().map(x=>({...x,custom:true}))];
const markerCoord=(m,key)=>Number.isFinite(Number(m?.[key]))?Number(m[key]):50;
const toast=msg=>{const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(globalThis.__lmToast);globalThis.__lmToast=setTimeout(()=>t.classList.remove('show'),2400)};
const refresh=()=>globalThis.JMA_RENDER?.();
const go=id=>{location.hash=`#/${id}`};

// The intro belongs to a route visit, not to a render or the zoomable map plane.
const flybyMotion=matchMedia('(prefers-reduced-motion: reduce)');
let mapVisit=null;
function stopMapFlyby(){
  if(!mapVisit)return;
  cancelAnimationFrame(mapVisit.frame);
  mapVisit.layer?.remove();
  mapVisit.layer=null;
}
function enterMapFlyby(){
  if(mapVisit)return;
  const visit=mapVisit={frame:0,layer:null};
  if(flybyMotion.matches)return;
  const image=new Image();
  image.src='./assets/live-map/by-the-wind.png';
  image.alt='';image.draggable=false;image.className='lm-flyby-creature';
  image.decode().then(()=>{
    if(mapVisit!==visit||flybyMotion.matches||!qs('#lmBoard'))return;
    const layer=document.createElement('div');
    layer.className=matchMedia('(max-width:820px)').matches?'lm-flyby lm-flyby-mobile':'lm-flyby';
    layer.setAttribute('aria-hidden','true');
    const scene=document.createElement('div');scene.className='lm-flyby-scene';
    scene.append(image);layer.append(scene);visit.layer=layer;
    // Keep one animation node outside #app so internal renders cannot restart it.
    const followBoard=()=>{
      const board=qs('#lmBoard');
      if(mapVisit!==visit||!board||flybyMotion.matches){stopMapFlyby();return}
      const rect=board.getBoundingClientRect();
      layer.style.left=`${rect.left+board.clientLeft}px`;
      layer.style.top=`${rect.top+board.clientTop}px`;
      layer.style.width=`${board.clientWidth}px`;
      layer.style.height=`${board.clientHeight}px`;
      layer.style.setProperty('--fly-width',`${board.clientWidth}px`);
      layer.style.setProperty('--fly-height',`${board.clientHeight}px`);
      visit.frame=requestAnimationFrame(followBoard);
    };
    image.addEventListener('animationend',stopMapFlyby,{once:true});
    followBoard();document.body.append(layer);
  }).catch(()=>{/* An unavailable decorative image must never break the map. */});
}
window.addEventListener('hashchange',()=>{
  const route=location.hash.split('/')[1];
  if(route!=='map'&&route!=='live-map'){stopMapFlyby();mapVisit=null}
});
flybyMotion.addEventListener('change',e=>{if(e.matches)stopMapFlyby()});

function state(){
  const scenarios=Array.isArray(AD().map?.scenarios)?AD().map.scenarios:[];
  const fallback=scenarios.some(x=>x.id==='way-of-winter')?'way-of-winter':scenarios[0]?.id||'way-of-winter';
  const scenario=read('jma_map_scenario',fallback)||fallback;
  const q=String(read('jma_map_q','')||'');
  const category=String(read('jma_map_cat','all')||'all');
  const selectedId=String(read('jma_map_selected','')||'');
  const draft=arr('jma_route_draft');
  const candidates=allMarkers().filter(m=>m.scenario===scenario);
  const categories=[...new Set(candidates.map(m=>m.category).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'de'));
  const visible=candidates.filter(m=>(category==='all'||m.category===category)&&(!q||`${m.name||''} ${m.category||''} ${m.note||''} ${m.location||''}`.toLowerCase().includes(q.toLowerCase())));
  const selected=allMarkers().find(m=>m.id===selectedId)||null;
  return {scenarios,fallback,scenario,q,category,selectedId,draft,candidates,categories,visible,selected};
}

function scenarioName(s,id){return s.scenarios.find(x=>x.id===id)?.name||id||'—'}

function detailMarkup(s){
  const m=s.selected;
  const tools=`<div class="lm-detail-actions"><button type="button" data-lm-focus-search>MARKER AUSWÄHLEN →</button><button type="button" data-lm-go="routes">ROUTEN VERWALTEN</button><button type="button" data-lm-filter-label="Ressourcen">RESSOURCEN</button><button type="button" data-lm-filter-label="Abweichler">ABWEICHLER</button></div>`;
  if(!m){
    return `<div class="lm-detail-empty">
      <div class="lm-detail-scan" aria-hidden="true"><i></i><span>⌖</span></div>
      <small>DETAILANSICHT</small><h2>MARKER AUSWÄHLEN</h2>
      <p>Wähle einen vorhandenen Marker auf der Karte. Angezeigt werden ausschließlich Daten aus dem bestehenden Kartenbestand oder aus deinen eigenen lokalen Markern.</p>
      ${tools}
    </div>`;
  }
  const gx=m.gameX!==undefined&&m.gameX!==''?esc(m.gameX):'—';
  const gy=m.gameY!==undefined&&m.gameY!==''?esc(m.gameY):'—';
  const inDraft=s.draft.includes(m.id);
  return `<div class="lm-detail-selected">
    <header><small>${esc(m.category||'MARKER')}</small><h2>${esc(m.name||'Unbenannter Marker')}</h2><span>${m.custom?'EIGENER MARKER':'ARCHIVMARKER'}</span></header>
    <dl>
      <div><dt>Szenario</dt><dd>${esc(scenarioName(s,m.scenario||s.scenario))}</dd></div>
      <div><dt>Kategorie</dt><dd>${esc(m.category||'—')}</dd></div>
      <div><dt>Spiel X</dt><dd>${gx}</dd></div>
      <div><dt>Spiel Y</dt><dd>${gy}</dd></div>
      <div><dt>Prüfstatus</dt><dd>${esc(m.verified||'lokal')}</dd></div>
    </dl>
    <section><small>NOTIZ / INFORMATION</small><p>${esc(m.note||m.location||'Für diesen Marker ist keine zusätzliche Beschreibung hinterlegt.')}</p></section>
    <div class="lm-detail-actions">
      <button type="button" class="${inDraft?'active':''}" data-lm-route-toggle="${esc(m.id)}">${inDraft?'✓ IN ROUTE':'＋ ZUR ROUTE'}</button>
      ${m.custom?`<button type="button" class="danger" data-lm-delete="${esc(m.id)}">MARKER LÖSCHEN</button>`:'<button type="button" data-lm-go="routes">ROUTEN ÖFFNEN</button>'}
    </div>
    ${Array.isArray(m.catalogIds)&&m.catalogIds.length?`<section><small>VERKNÜPFTE KATALOGEINTRÄGE</small><div class="lm-detail-actions">${m.catalogIds.map(id=>{const entry=globalThis.CATALOG_DATA?.entries?.find(x=>x.id===id);return `<button type="button" data-lm-catalog="${esc(id)}" ${entry?'':'disabled'}>${esc(entry?.name_de||id)}</button>`}).join('')}</div></section>`:''}
    ${tools}
  </div>`;
}

function renderLiveMap(){
  const s=state();
  const routeMarkers=s.draft.map(id=>allMarkers().find(m=>m.id===id&&m.scenario===s.scenario)).filter(Boolean);
  const line=routeMarkers.map(m=>`${markerCoord(m,'mapX')},${markerCoord(m,'mapY')}`).join(' ');
  const selectedOnScenario=s.selected&&s.selected.scenario===s.scenario?s.selected:null;
  const navX=selectedOnScenario?markerCoord(selectedOnScenario,'mapX'):48;
  const navY=selectedOnScenario?markerCoord(selectedOnScenario,'mapY'):52;
  const customCount=customMarkers().filter(m=>m.scenario===s.scenario).length;
  return `<section class="lm-page" aria-label="Live-Karte">
    <header class="lm-command-head">
      <div class="lm-heading">
        <div class="lm-kicker"><i></i><span>LIVE MAP // KARTENZENTRALE</span></div>
        <h1>LIVE <em>KARTE</em></h1>
        <p>Interaktive Kartenoberfläche mit vorhandenem Markerbestand, lokalen Markern und deinen gespeicherten Routen. Wähle Szenarien, erkunde Fundorte und öffne deine Farmrouten.</p>
      </div>
      <div class="lm-command-metrics" aria-label="Kartenstatus">
        <article><small>SZENARIEN</small><b>${s.scenarios.length}</b><span>vorhanden</span></article>
        <article><small>SICHTBAR</small><b>${s.visible.length}</b><span>aktuelle Filterung</span></article>
        <article><small>ROUTE</small><b>${s.draft.length}</b><span>Stationen im Entwurf</span></article>
        <article><small>EIGENE</small><b>${customCount}</b><span>Marker im Szenario</span></article>
      </div>
    </header>

    <div class="lm-workspace">
      <aside class="lm-rail lm-glass">
        <div class="lm-panel-title"><div><small>KARTENSTEUERUNG</small><b>NAVIGATION</b></div><span>01</span></div>
        <label class="lm-field"><span>SZENARIO</span><select id="lmScenario">${s.scenarios.map(x=>`<option value="${esc(x.id)}" ${x.id===s.scenario?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="lm-search"><span aria-hidden="true">⌕</span><input id="lmSearch" value="${esc(s.q)}" placeholder="Marker suchen …" aria-label="Marker suchen"></label>
        <div class="lm-category-list" aria-label="Marker-Kategorien">
          <button class="${s.category==='all'?'active':''}" type="button" data-lm-cat="all"><i>⌖</i><span>Alle Marker</span><em>${s.candidates.length}</em></button>
          ${s.categories.map(c=>`<button class="${s.category===c?'active':''}" type="button" data-lm-cat="${esc(c)}"><i>◇</i><span>${esc(c)}</span><em>${s.candidates.filter(m=>m.category===c).length}</em></button>`).join('')}
        </div>
        <button class="lm-reset" id="lmResetFilters" type="button">↻ FILTER ZURÜCKSETZEN</button>

        <div class="lm-panel-title lm-route-title"><div><small>ROUTENENTWURF</small><b>${s.draft.length} STATIONEN</b></div><span>02</span></div>
        <div class="lm-route-draft">${s.draft.length?s.draft.map((id,i)=>{const m=allMarkers().find(x=>x.id===id);return m?`<div><b>${String(i+1).padStart(2,'0')}</b><span>${esc(m.name||'Marker')}</span><button type="button" data-lm-route-remove="${esc(id)}" aria-label="Aus Route entfernen">×</button></div>`:''}).join(''):'<p>Noch keine Station ausgewählt.</p>'}</div>
        <form class="lm-route-save" id="lmRouteSave"><input name="name" required maxlength="80" placeholder="Routenname" aria-label="Routenname" ${s.draft.length?'':'disabled'}><button type="submit" ${s.draft.length?'':'disabled'}>SPEICHERN</button></form>
        <button class="lm-open-routes" type="button" data-lm-go="routes">GESPEICHERTE ROUTEN →</button>
      </aside>

      <div class="lm-map-column">
        <div class="lm-toolbar lm-glass">
          <div><small>AKTIVES SZENARIO</small><b>${esc(scenarioName(s,s.scenario))}</b></div>
          <div class="lm-toolbar-actions">
            <button id="lmPlace" type="button" title="Eigenen Marker setzen">＋ MARKER</button>
            <span class="lm-zoom"><button id="lmZoomOut" type="button" aria-label="Verkleinern">−</button><b id="lmZoomLabel">100%</b><button id="lmZoomIn" type="button" aria-label="Vergrößern">+</button><button id="lmResetView" type="button">RESET</button></span>
          </div>
        </div>

        <div class="lm-board" id="lmBoard">
          <div class="lm-plane" id="lmPlane">
            <img class="lm-map-image" id="lmMapImage" src="./assets/map/once-human-world-map.webp" alt="Once Human Weltkarte" draggable="false">
            <svg class="lm-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${line?`<polyline points="${line}" fill="none" vector-effect="non-scaling-stroke"/>`:''}</svg>
            ${s.visible.map(m=>`<button class="lm-marker ${m.id===s.selectedId?'active':''} ${m.custom?'custom':''}" type="button" data-lm-marker="${esc(m.id)}" title="${esc(m.name||'Marker')}" style="left:${markerCoord(m,'mapX')}%;top:${markerCoord(m,'mapY')}%"><span>⌖</span></button>`).join('')}
            <div class="lm-navigator" style="--nav-x:${navX}%;--nav-y:${navY}%" aria-hidden="true">
              <div class="lm-nav-ring"></div><img src="./assets/live-map/shattered-maiden.png" alt=""><span>${selectedOnScenario?esc(selectedOnScenario.name||'Marker'):'NAVIGATOR'}</span>
            </div>
            <img class="lm-butterfly" src="./assets/live-map/butterfly-emissary.webp" alt="" aria-hidden="true">
          </div>
          <div class="lm-board-chrome lm-board-tl" aria-hidden="true"></div><div class="lm-board-chrome lm-board-br" aria-hidden="true"></div>
          <div class="lm-compass" aria-hidden="true"><b>N</b><span>✥</span><small>W&nbsp;&nbsp;&nbsp;E</small></div>
          <div class="lm-instruction" id="lmInstruction">ZIEHEN = VERSCHIEBEN · MAUSRAD / ± = ZOOMEN</div>
        </div>
      </div>

      <aside class="lm-detail lm-glass" id="lmDetail">
        <div class="lm-panel-title"><div><small>MARKERDOSSIER</small><b>DETAILS</b></div><span>03</span></div>
        ${detailMarkup(s)}
      </aside>
    </div>
  </section>`;
}

function openMarkerDialog(mapX,mapY,scenario){
  let dialog=qs('#lmMarkerDialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='lmMarkerDialog';dialog.className='lm-marker-dialog';document.body.appendChild(dialog)}
  dialog.innerHTML=`<form id="lmMarkerForm"><button class="dialog-close" type="button" aria-label="Schließen">×</button><small>LIVE MAP // EIGENER MARKER</small><h2>MARKER ANLEGEN</h2><label>NAME<input name="name" required maxlength="80"></label><label>KATEGORIE<input name="category" required maxlength="60" value="Eigener Marker"></label><label>NOTIZ<textarea name="note" maxlength="1000"></textarea></label><div class="lm-dialog-grid"><label>SPIEL X <input name="gameX" type="number"></label><label>SPIEL Y <input name="gameY" type="number"></label></div><button class="cyan-btn" type="submit">MARKER SPEICHERN</button></form>`;
  dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget),name=String(fd.get('name')||'').trim(),category=String(fd.get('category')||'').trim();if(!name||!category)return;
    const marker={id:uid('marker'),name,category,note:String(fd.get('note')||'').trim(),gameX:fd.get('gameX'),gameY:fd.get('gameY'),mapX,mapY,scenario,created:new Date().toISOString(),catalogIds:[]};
    write('jma_custom_markers',[...customMarkers(),marker]);write('jma_map_selected',marker.id);dialog.close();refresh();toast('Eigener Marker gespeichert.');
  };
  dialog.showModal();setTimeout(()=>dialog.querySelector('input[name="name"]')?.focus(),20);
}

function bindLiveMap(){
  enterMapFlyby();
  const current=state();
  qsa('[data-lm-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.lmGo)));
  qsa('[data-lm-focus-search]').forEach(b=>b.addEventListener('click',()=>qs('#lmSearch')?.focus()));
  qsa('[data-lm-filter-label]').forEach(b=>b.addEventListener('click',()=>{write('jma_map_q',b.dataset.lmFilterLabel);refresh()}));
  qsa('[data-lm-catalog]').forEach(b=>b.addEventListener('click',()=>{sessionStorage.setItem('jma_open_catalog',b.dataset.lmCatalog);go('database')}));
  qs('#lmScenario')?.addEventListener('change',e=>{write('jma_map_scenario',e.target.value);write('jma_map_selected','');write('jma_map_cat','all');write('jma_map_q','');refresh()});
  let searchTimer;
  qs('#lmSearch')?.addEventListener('input',e=>{
    const input=e.target;
    write('jma_map_q',input.value);clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{
      if(!input.isConnected)return;
      const focused=document.activeElement===input,start=input.selectionStart,end=input.selectionEnd,direction=input.selectionDirection;
      refresh();
      const next=qs('#lmSearch');
      if(focused&&next){next.focus({preventScroll:true});next.setSelectionRange(start,end,direction)}
    },180);
  });
  qsa('[data-lm-cat]').forEach(b=>b.addEventListener('click',()=>{write('jma_map_cat',b.dataset.lmCat);refresh()}));
  qs('#lmResetFilters')?.addEventListener('click',()=>{write('jma_map_cat','all');write('jma_map_q','');refresh()});
  qsa('[data-lm-marker]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();write('jma_map_selected',b.dataset.lmMarker);refresh()}));
  qsa('[data-lm-route-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.lmRouteToggle,rows=arr('jma_route_draft');const next=rows.includes(id)?rows.filter(x=>x!==id):[...rows,id];write('jma_route_draft',next);refresh()}));
  qsa('[data-lm-route-remove]').forEach(b=>b.addEventListener('click',()=>{write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==b.dataset.lmRouteRemove));refresh()}));
  qsa('[data-lm-delete]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('Eigenen Marker löschen?'))return;const id=b.dataset.lmDelete;write('jma_custom_markers',customMarkers().filter(x=>x.id!==id));write('jma_map_selected','');write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==id));write('jma_routes',arr('jma_routes').map(r=>({...r,markers:Array.isArray(r.markers)?r.markers.filter(x=>x!==id):[]})));refresh()}));
  qs('#lmRouteSave')?.addEventListener('submit',e=>{e.preventDefault();const draft=arr('jma_route_draft'),name=String(new FormData(e.currentTarget).get('name')||'').trim();if(!draft.length||!name)return;const rows=arr('jma_routes');rows.unshift({id:uid('route'),name,markers:[...draft],created:new Date().toISOString()});write('jma_routes',rows);write('jma_route_draft',[]);refresh();toast('Route gespeichert.');});

  const board=qs('#lmBoard'),plane=qs('#lmPlane'),image=qs('#lmMapImage'),zoomLabel=qs('#lmZoomLabel'),instruction=qs('#lmInstruction');
  if(!board||!plane||!image)return;
  let saved=read('jma_map_view',{zoom:1,x:0,y:0});
  let view={zoom:Math.max(1,Math.min(2.6,Number(saved?.zoom)||1)),x:Number(saved?.x)||0,y:Number(saved?.y)||0};
  let placing=false,drag=null,pinch=null;
  const pointers=new Map();
  const fit=()=>{const bw=board.clientWidth,bh=board.clientHeight,ratio=(image.naturalWidth&&image.naturalHeight)?image.naturalWidth/image.naturalHeight:1.5;let w=bw,h=bw/ratio;if(h<bh){h=bh;w=bh*ratio}return {w,h}};
  const apply=()=>{if(!board.isConnected)return;const base=fit();view.zoom=Math.max(1,Math.min(2.6,view.zoom));const maxX=Math.max(0,(base.w*view.zoom-board.clientWidth)/2),maxY=Math.max(0,(base.h*view.zoom-board.clientHeight)/2);view.x=Math.max(-maxX,Math.min(maxX,view.x));view.y=Math.max(-maxY,Math.min(maxY,view.y));plane.style.width=`${base.w}px`;plane.style.height=`${base.h}px`;plane.style.left=`calc(50% + ${view.x}px)`;plane.style.top=`calc(50% + ${view.y}px)`;plane.style.transform=`translate(-50%,-50%) scale(${view.zoom})`;plane.style.setProperty('--inverse-zoom',String(1/view.zoom));if(zoomLabel)zoomLabel.textContent=`${Math.round(view.zoom*100)}%`;write('jma_map_view',view)};
  const zoom=delta=>{view.zoom=Math.max(1,Math.min(2.6,view.zoom+delta));apply()};
  qs('#lmZoomIn')?.addEventListener('click',()=>zoom(.15));qs('#lmZoomOut')?.addEventListener('click',()=>zoom(-.15));qs('#lmResetView')?.addEventListener('click',()=>{view={zoom:1,x:0,y:0};apply()});
  qs('#lmPlace')?.addEventListener('click',e=>{placing=!placing;e.currentTarget.classList.toggle('active',placing);e.currentTarget.textContent=placing?'× ABBRECHEN':'＋ MARKER';board.classList.toggle('placing',placing);if(instruction)instruction.textContent=placing?'AUF DIE GEWÜNSCHTE POSITION KLICKEN':'ZIEHEN = VERSCHIEBEN · MAUSRAD / ± = ZOOMEN'});
  board.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.1:-.1)},{passive:false});
  const resetGesture=()=>{const pts=[...pointers.values()];if(pts.length>=2){const [a,b]=pts;pinch={distance:Math.hypot(b.x-a.x,b.y-a.y),zoom:view.zoom,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,bx:view.x,by:view.y};drag=null}else{pinch=null;const a=pts[0];drag=a?{x:a.x,y:a.y,bx:view.x,by:view.y}:null}};
  board.addEventListener('pointerdown',e=>{if(placing||e.target.closest('[data-lm-marker]')||e.button>0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});board.setPointerCapture(e.pointerId);resetGesture()});
  board.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],rect=board.getBoundingClientRect(),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,next=Math.max(1,Math.min(2.6,pinch.zoom*Math.hypot(b.x-a.x,b.y-a.y)/(pinch.distance||1))),ratio=next/pinch.zoom;view.x=cx-rect.left-rect.width/2-(pinch.cx-rect.left-rect.width/2-pinch.bx)*ratio;view.y=cy-rect.top-rect.height/2-(pinch.cy-rect.top-rect.height/2-pinch.by)*ratio;view.zoom=next;apply()}else if(drag){view.x=drag.bx+e.clientX-drag.x;view.y=drag.by+e.clientY-drag.y;apply()}});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(ev,e=>{pointers.delete(e.pointerId);resetGesture()});
  board.addEventListener('click',e=>{if(!placing||e.target.closest('[data-lm-marker]'))return;const rect=plane.getBoundingClientRect(),mapX=(e.clientX-rect.left)/rect.width*100,mapY=(e.clientY-rect.top)/rect.height*100;if(mapX<0||mapX>100||mapY<0||mapY>100)return;placing=false;board.classList.remove('placing');openMarkerDialog(mapX,mapY,current.scenario)});
  if(!image.complete)image.addEventListener('load',apply,{once:true});
  const observer=new ResizeObserver(()=>{if(board.isConnected)apply();else observer.disconnect()});observer.observe(board);apply();
}

globalThis.FULL_ROUTE_RENDERERS={...(globalThis.FULL_ROUTE_RENDERERS||{}),map:renderLiveMap,'live-map':renderLiveMap};
globalThis.FULL_ROUTE_BINDERS={...(globalThis.FULL_ROUTE_BINDERS||{}),map:bindLiveMap,'live-map':bindLiveMap};
})();
