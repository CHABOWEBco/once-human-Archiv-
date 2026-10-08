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
const refresh=()=>{if(!refreshExpandedMap?.())globalThis.JMA_RENDER?.()};
const go=id=>{location.hash=`#/${id}`};

// The intro belongs to a route visit, not to a render or the zoomable map plane.
const flybyMotion=matchMedia('(prefers-reduced-motion: reduce)');
let mapVisit=null,disposeMapView=null,refreshExpandedMap=null;
const playerSession={follow:false,scenario:null,lastPosition:null,scope:null};
const calibrationKey=()=>String(globalThis.JMA_STORE?.key?.('jma_custom_markers')||'guest')+':map-calibration';
const calibrationFor=scenario=>{try{const c=read(calibrationKey(),{})[scenario];return c?.confirmed===true&&c.image==='./assets/map/once-human-world-map.webp'?globalThis.JMA_TELEMETRY.calibrate(c.points):null}catch{return null}};
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
    followBoard();(qs('.lm-workspace.is-expanded')||document.body).append(layer);
  }).catch(()=>{/* An unavailable decorative image must never break the map. */});
}
window.addEventListener('hashchange',()=>{
  disposeMapView?.();
  const route=location.hash.split('/')[1];
  if(route!=='map'&&route!=='live-map'){stopMapFlyby();mapVisit=null}
},{capture:true});
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

function navigationMarkup(s){
  return `        <div class="lm-panel-title"><div><small>KARTENSTEUERUNG</small><b>NAVIGATION</b></div><span>01</span><button type="button" class="lm-drawer-close lm-expanded-only" data-lm-close-panel="filter" aria-label="Filter schließen">×</button></div>
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
        <button class="lm-open-routes" type="button" data-lm-go="routes">GESPEICHERTE ROUTEN →</button>`;
}

function markerMarkup(m,s){
  return `<button class="lm-marker ${m.id===s.selectedId?'active':''} ${m.custom?'custom':''}" type="button" data-lm-marker="${esc(m.id)}" title="${esc(m.name||'Marker')}" style="left:${markerCoord(m,'mapX')}%;top:${markerCoord(m,'mapY')}%"><span>⌖</span></button>`;
}

function renderLiveMap(){
  disposeMapView?.();
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

    <div class="lm-workspace" id="lmWorkspace" tabindex="-1">
      <aside class="lm-rail lm-glass" id="lmFilters">
        ${navigationMarkup(s)}
      </aside>

      <div class="lm-map-column">
        <div class="lm-toolbar lm-glass">
          <div class="lm-telemetry-title"><small>AKTIVES SZENARIO · <span id="lmTelemetryStatus" role="status">OFFLINE</span></small><b>${esc(scenarioName(s,s.scenario))}</b><button class="lm-companion-open" id="lmCompanion" type="button" aria-label="Companion und Spielersteuerung öffnen" title="Companion, Spieler folgen und Kalibrierung"></button></div>
          <div class="lm-toolbar-actions">
            <button id="lmExpand" class="lm-expand" type="button" aria-controls="lmWorkspace" aria-expanded="false">⛶ KARTE MAXIMIEREN</button>
            <button class="lm-expanded-only" type="button" data-lm-panel="filter" aria-controls="lmFilters" aria-expanded="false">FILTER</button>
            <button class="lm-expanded-only" type="button" data-lm-panel="detail" aria-controls="lmDetail" aria-expanded="false">DETAILS</button>
            <button id="lmPlace" type="button" title="Eigenen Marker setzen">＋ MARKER</button>
            <span class="lm-zoom"><button id="lmZoomOut" type="button" aria-label="Verkleinern">−</button><b id="lmZoomLabel">100%</b><button id="lmZoomIn" type="button" aria-label="Vergrößern">+</button><button id="lmResetView" type="button">RESET</button></span>
            <button id="lmCollapse" class="lm-expanded-only" type="button">× SCHLIESSEN</button>
          </div>
        </div>

        <div class="lm-board" id="lmBoard">
          <div class="lm-plane" id="lmPlane">
            <img class="lm-map-image" id="lmMapImage" src="./assets/map/once-human-world-map.webp" alt="Once Human Weltkarte" draggable="false">
            <svg class="lm-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${line?`<polyline points="${line}" fill="none" vector-effect="non-scaling-stroke"/>`:''}<line class="lm-player-start" hidden vector-effect="non-scaling-stroke"/></svg>
            ${s.visible.map(m=>markerMarkup(m,s)).join('')}
            <div class="lm-player" id="lmPlayer" hidden role="img" aria-label="Spielerposition unverifiziert"><i class="lm-player-heading" hidden>▲</i><b>●</b><small></small></div>
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
        <div class="lm-panel-title"><div><small>MARKERDOSSIER</small><b>DETAILS</b></div><span>03</span><button type="button" class="lm-drawer-close lm-expanded-only" data-lm-close-panel="detail" aria-label="Details schließen">×</button></div>
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
  disposeMapView?.();
  enterMapFlyby();
  let current=state(),searchTimer;
  if(playerSession.scenario!==current.scenario||playerSession.scope!==calibrationKey()){playerSession.follow=false;playerSession.lastPosition=null;playerSession.scenario=current.scenario;playerSession.scope=calibrationKey()}
  const workspace=qs('#lmWorkspace'),page=qs('.lm-page'),rail=qs('#lmFilters'),detail=qs('#lmDetail');

  const board=qs('#lmBoard'),plane=qs('#lmPlane'),image=qs('#lmMapImage'),zoomLabel=qs('#lmZoomLabel'),instruction=qs('#lmInstruction');
  if(!board||!plane||!image)return;
  // One controller owns gestures, visual updates and persistence for this board.
  const events=new AbortController(),listen=(el,type,fn,options={})=>el?.addEventListener(type,fn,{...options,signal:events.signal});
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const saved=read('jma_map_view',{zoom:1,x:0,y:0});
  let view={zoom:clamp(Number(saved?.zoom)||1,1,2.6),x:Number(saved?.x)||0,y:Number(saved?.y)||0};
  let placing=false,drag=null,pinch=null,disposed=false,persistTimer=0;
  let lastStored=JSON.stringify(view),dirty=false;
  const pointers=new Map(),desktop=matchMedia('(hover: hover) and (pointer: fine)');
  let expanded=false,openPanel=null,background=[],returnScroll=null,normalMinHeight='',normalGeometry=null;
  const navigationHint=()=>desktop.matches&&innerWidth>1180?'MAUS ZUM RAND = GLEITEN · ZIEHEN · MAUSRAD / ± = ZOOMEN':'ZIEHEN = VERSCHIEBEN · MAUSRAD / ± = ZOOMEN';
  if(instruction)instruction.textContent=navigationHint();
  let geometry={w:0,h:0,bw:0,bh:0},inside=false,hoverPoint=null,interactive=false;
  let panFrame=0,lastFrame=0,velocity={x:0,y:0};
  const measure=()=>{
    const bw=board.clientWidth,bh=board.clientHeight,ratio=(image.naturalWidth&&image.naturalHeight)?image.naturalWidth/image.naturalHeight:1.5;
    const w=Math.max(bw,bh*ratio),h=w/ratio;
    // Keep the same world point at the center when the existing board changes size.
    if(geometry.w&&geometry.h){view.x*=w/geometry.w;view.y*=h/geometry.h}
    geometry={w,h,bw,bh};
    plane.style.width=`${geometry.w}px`;plane.style.height=`${geometry.h}px`;
  };
  const bounds=()=>({x:Math.max(0,(geometry.w*view.zoom-geometry.bw)/2),y:Math.max(0,(geometry.h*view.zoom-geometry.bh)/2)});
  // Same stored view/schema: expanded offsets are expressed in the normal fit.
  const storageView=()=>expanded&&normalGeometry?{zoom:view.zoom,x:view.x*normalGeometry.w/geometry.w,y:view.y*normalGeometry.h/geometry.h}:{...view};
  const apply=()=>{
    if(disposed||!board.isConnected)return;
    view.zoom=clamp(view.zoom,1,2.6);const limit=bounds();
    view.x=clamp(view.x,-limit.x,limit.x);view.y=clamp(view.y,-limit.y,limit.y);
    plane.style.transform=`translate3d(calc(-50% + ${view.x}px),calc(-50% + ${view.y}px),0) scale(${view.zoom})`;
    plane.style.setProperty('--inverse-zoom',String(1/view.zoom));
    const label=`${Math.round(view.zoom*100)}%`;if(zoomLabel&&zoomLabel.textContent!==label)zoomLabel.textContent=label;
    dirty=JSON.stringify(storageView())!==lastStored;
  };
  const persist=()=>{
    clearTimeout(persistTimer);persistTimer=0;
    if(!dirty)return;
    const stored=storageView();write('jma_map_view',stored);lastStored=JSON.stringify(stored);dirty=false;
  };
  const queuePersist=()=>{clearTimeout(persistTimer);persistTimer=setTimeout(persist,250)};
  const telemetry=globalThis.JMA_TELEMETRY,pin=qs('#lmPlayer',plane);
  let sample=telemetry?.getState(),telemetryInfo=telemetry?.getInfo(),position=null,angle=null,interactingUntil=0,companionDialog=null,calibrationDialog=null;
  const centerPlayer=(explicit=false)=>{
    if(!position||pointers.size||placing||!explicit&&performance.now()<interactingUntil||qs('dialog[open]'))return false;
    inside=false;stopPan(false);view.x=(.5-position.x/100)*geometry.w*view.zoom;view.y=(.5-position.y/100)*geometry.h*view.zoom;apply();if(!playerSession.follow)queuePersist();return true;
  };
  const telemetryStatus=()=>sample?.source==='simulator'?'SIMULATION':['lost','reconnecting'].includes(telemetryInfo?.transport)?'VERBINDUNG VERLOREN':!sample?.connected?(telemetryInfo?.transport==='waiting'?'WARTE AUF SPIEL':'OFFLINE'):!sample.gameRunning?'WARTE AUF SPIEL':telemetryInfo.verifiedSource&&sample.scene==='ingame'?'LIVE VERBUNDEN':'SPIEL ERKANNT';
  const updatePlayer=()=>{
    if(disposed||!pin||!telemetry)return;
    const cal=calibrationFor(current.scenario),usable=sample?.connected&&sample.gameRunning&&sample.scene==='ingame'&&sample.scenario===current.scenario&&sample.x!==null&&sample.y!==null;
    position=usable&&cal?telemetry.project(cal,sample.x,sample.y):null;
    if(position&&(position.x<0||position.x>100||position.y<0||position.y>100))position=null;
    if(position)playerSession.lastPosition={...position,source:sample.source,timestamp:sample.timestamp};
    const visual=position||playerSession.lastPosition;
    pin.hidden=!visual;pin.classList.toggle('is-lost',!position);const visualSource=position?sample.source:visual?.source||sample?.source||'none';pin.dataset.source=visualSource;
    if(visual){pin.style.left=visual.x+'%';pin.style.top=visual.y+'%';pin.setAttribute('aria-label',(position?'':'Letzte Position – Verbindung/Zuordnung fehlt · ')+(visualSource==='simulator'?'SIMULATION':'Quelle NICHT VERIFIZIERT'))}
    const arrow=qs('.lm-player-heading',pin),h=position&&sample.heading!==null?telemetry.heading(cal,sample.heading,geometry.w/geometry.h):null;
    arrow.hidden=h===null;if(h!==null){angle=angle===null?h:angle+(((h-angle)%360+540)%360)-180;arrow.style.transform='rotate('+angle+'deg)'}
    qs('small',pin).textContent=visualSource==='simulator'?'SIM':'?';
    const status=qs('#lmTelemetryStatus',workspace);if(status.textContent!==telemetryStatus())status.textContent=telemetryStatus();status.title=telemetryInfo?.reason||'';
    const next=current.draft.map(id=>current.candidates.find(m=>m.id===id)).find(Boolean);
    for(const el of qsa('[data-lm-marker]',plane))el.classList.toggle('lm-next-station',Boolean(position&&next?.id===el.dataset.lmMarker));
    const start=qs('.lm-player-start',plane);start.toggleAttribute('hidden',!(position&&next));if(position&&next){for(const [key,value] of Object.entries({x1:position.x,y1:position.y,x2:markerCoord(next,'mapX'),y2:markerCoord(next,'mapY')}))start.setAttribute(key,value)}
    if(companionDialog?.open){qs('[data-companion-status]',companionDialog).textContent=telemetryStatus()+' · Szene: '+(sample?.scene||'unknown')+' · '+(cal?'Kalibrierung vom Benutzer bestätigt, RMS '+cal.rmse.toFixed(3)+' Prozentpunkte.':'Keine Kalibrierung.');qs('[data-player-follow]',companionDialog).setAttribute('aria-pressed',String(playerSession.follow));qs('[data-player-follow]',companionDialog).textContent=playerSession.follow?'SPIELER FOLGEN: AN':'SPIELER FOLGEN: AUS';qs('[data-player-center]',companionDialog).disabled=!position;qs('[data-player-follow]',companionDialog).disabled=!position}
    if(companionDialog?.open){
      const selectedDistance=telemetry.distance(sample,current.selected,telemetryInfo),routeDistance=telemetry.distance(sample,next,telemetryInfo);
      const nearest=current.visible.map(m=>({m,d:telemetry.distance(sample,m,telemetryInfo)})).filter(x=>x.d!==null).sort((a,b)=>a.d-b.d)[0];
      const fmt=d=>d===null?'NICHT VERIFIZIERT':d.toFixed(1)+' Spieleinheiten (keine belegten Meter)';
      qs('[data-player-distances]',companionDialog).textContent='Ausgewählt: '+fmt(selectedDistance)+' · nächster sichtbarer Marker: '+(nearest?nearest.m.name+' / '+fmt(nearest.d):'NICHT VERIFIZIERT')+' · nächste Routenstation: '+fmt(routeDistance);
    }
    if(playerSession.follow)centerPlayer();
  };
  const openCalibration=()=>{
    companionDialog?.close();calibrationDialog?.remove();const d=calibrationDialog=document.createElement('dialog');d.className='lm-marker-dialog lm-companion-dialog';
    const saved=calibrationFor(current.scenario),available=current.candidates.filter(m=>telemetry.gamePoint(m)&&Number.isFinite(Number(m.mapX))&&Number.isFinite(Number(m.mapY))).map(m=>({gameX:Number(m.gameX),gameY:Number(m.gameY),mapX:Number(m.mapX),mapY:Number(m.mapY)}));
    d.innerHTML='<form><button class="dialog-close" type="button" aria-label="Kalibrierung schließen">×</button><small>KOORDINATENKALIBRIERUNG · '+esc(scenarioName(current,current.scenario))+'</small><h2>REFERENZPUNKTE</h2><p>Mindestens vier bekannte, nicht kollineare Punkte. Je Zeile: Game X, Game Y, Map X %, Map Y %. Keine Spielkoordinaten werden automatisch erfunden.</p><label>Referenzen<textarea data-calibration-points rows="7" required aria-label="Kalibrierungspunkte"></textarea></label><label class="lm-confirm-reference"><input type="checkbox" data-calibration-confirm required> Ich habe diese Referenzen für dieses Szenario und Kartenbild überprüft.</label><p data-calibration-error role="status">'+available.length+' vorhandene Marker mit Koordinatenpaar. Diese sind nicht automatisch verifiziert.</p><button type="submit" class="cyan-btn">KALIBRIERUNG SPEICHERN</button><button type="button" data-calibration-clear class="lm-companion-action">KALIBRIERUNG ENTFERNEN</button></form>';
    qs('textarea',d).value=(saved?.points||available).map(p=>[p.gameX,p.gameY,p.mapX,p.mapY].join(', ')).join('\n');
    listen(qs('.dialog-close',d),'click',()=>d.close());listen(qs('[data-calibration-clear]',d),'click',()=>{const records=read(calibrationKey(),{});delete records[current.scenario];write(calibrationKey(),records);playerSession.follow=false;playerSession.lastPosition=null;d.close();updatePlayer()});
    listen(qs('form',d),'submit',e=>{e.preventDefault();try{if(!qs('[data-calibration-confirm]',d).checked)throw Error('Referenzen zuerst bestätigen.');const points=qs('textarea',d).value.trim().split(/\n+/).map(line=>{const values=line.trim().split(/[;,\s]+/).map(Number);if(values.length!==4)throw Error('Jede Zeile braucht genau vier Zahlen.');return Object.fromEntries(['gameX','gameY','mapX','mapY'].map((k,i)=>[k,values[i]]))});const fit=telemetry.calibrate(points),records=read(calibrationKey(),{});records[current.scenario]={points:fit.points,confirmed:true,image:image.getAttribute('src')};write(calibrationKey(),records);qs('[data-calibration-error]',d).textContent='Gespeichert · RMS '+fit.rmse.toFixed(3)+' · maximal '+fit.maxError.toFixed(3)+' Prozentpunkte. Residuen belegen keine echte Spielgenauigkeit.';updatePlayer()}catch(error){qs('[data-calibration-error]',d).textContent=error.message}});
    document.body.append(d);d.showModal();
  };
  const openCompanion=()=>{
    companionDialog?.remove();const d=companionDialog=document.createElement('dialog');d.className='lm-marker-dialog lm-companion-dialog';
    d.innerHTML='<form method="dialog"><button class="dialog-close" aria-label="Companion schließen">×</button><small>PLAYER TRACKING FOUNDATION</small><h2>COMPANION</h2><p data-companion-status role="status"></p><p>Game Reader: NICHT VORHANDEN. Bridge-Daten und Spielkoordinaten: NICHT VERIFIZIERT. Kein automatischer Szenariowechsel.</p><label>Loopback-Port<input data-companion-port type="number" min="1024" max="65535" value="8787"></label><button type="button" class="lm-companion-action" data-companion-connect>COMPANION VERBINDEN</button><button type="button" class="lm-companion-action" data-companion-disconnect>TRENNEN</button><button type="button" class="lm-companion-action" data-player-follow aria-pressed="false">SPIELER FOLGEN: AUS</button><button type="button" class="lm-companion-action" data-player-center>AUF SPIELER ZENTRIEREN</button><button type="button" class="lm-companion-action" data-player-calibrate>KALIBRIERUNG</button><p data-player-distances>Distanz zum Marker / nächsten sichtbaren Marker / nächster Routenstation: NICHT VERIFIZIERT. Keine Meter aus Kartenprozenten.</p></form>';
    listen(qs('[data-companion-connect]',d),'click',()=>{try{telemetry.connect(Number(qs('[data-companion-port]',d).value))}catch(error){qs('[data-companion-status]',d).textContent=error.message}});
    listen(qs('[data-companion-disconnect]',d),'click',()=>{playerSession.follow=false;telemetry.disconnect()});
    listen(qs('[data-player-calibrate]',d),'click',openCalibration);
    listen(qs('[data-player-follow]',d),'click',()=>{playerSession.follow=!playerSession.follow;d.close();if(playerSession.follow)centerPlayer(true)});
    listen(qs('[data-player-center]',d),'click',()=>{d.close();centerPlayer(true)});
    document.body.append(d);d.showModal();updatePlayer();
  };
  const userInteraction=()=>{playerSession.follow=false;interactingUntil=performance.now()+600;updatePlayer()};

  const stopPan=(flush=true)=>{
    if(!pointers.size)plane.style.willChange='';
    cancelAnimationFrame(panFrame);panFrame=0;lastFrame=0;velocity={x:0,y:0};if(flush)persist();
  };
  // Keep the middle 28% quiet, then make a deliberate move toward an edge felt.
  const axisSpeed=n=>{const speed=560*Math.pow(clamp((Math.abs(n)-.28)/.62,0,1),1.35);return speed<.6?0:-Math.sign(n)*speed};
  const canMove=(speed,position,limit)=>limit>.01&&((speed>0&&position<limit-.01)||(speed<0&&position>-limit+.01));
  const desired=()=>{
    if(playerSession.follow||!desktop.matches||!inside||!hoverPoint||interactive||placing||pointers.size||document.hidden||qs('dialog[open]'))return {x:0,y:0};
    const limit=bounds(),x=axisSpeed(hoverPoint.x),y=axisSpeed(hoverPoint.y);
    return {x:canMove(x,view.x,limit.x)?x:0,y:canMove(y,view.y,limit.y)?y:0};
  };
  const tick=time=>{
    panFrame=0;
    if(disposed||!board.isConnected){dispose();return}
    // Also pause when a moving marker arrives beneath a stationary pointer.
    const hit=hoverPoint&&document.elementFromPoint(hoverPoint.clientX,hoverPoint.clientY);
    if(hit?.closest('[data-lm-marker],button,input,select,textarea,a')||placing||pointers.size||qs('dialog[open]')){stopPan();return}
    const target=desired(),dt=lastFrame?Math.min((time-lastFrame)/1000,.06):1/60;lastFrame=time;
    const blend=flybyMotion.matches?1:1-Math.exp(-dt/((target.x||target.y)? .07 : .06));
    velocity.x+=(target.x-velocity.x)*blend;velocity.y+=(target.y-velocity.y)*blend;
    const limit=bounds();
    if(!canMove(velocity.x,view.x,limit.x)||(!target.x&&Math.abs(velocity.x)<.6))velocity.x=0;
    if(!canMove(velocity.y,view.y,limit.y)||(!target.y&&Math.abs(velocity.y)<.6))velocity.y=0;
    if(!velocity.x&&!velocity.y&&!target.x&&!target.y){stopPan();return}
    view.x+=velocity.x*dt;view.y+=velocity.y*dt;apply();
    panFrame=requestAnimationFrame(tick);
  };
  const requestPan=()=>{
    const target=desired();
    if(!panFrame&&(target.x||target.y)){lastFrame=0;plane.style.willChange='transform';panFrame=requestAnimationFrame(tick)}
  };
  const updateHover=e=>{
    if(e.pointerType!=='mouse'||!desktop.matches)return;
    const rect=board.getBoundingClientRect();
    inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
    hoverPoint={x:(e.clientX-rect.left-rect.width/2)/(geometry.bw/2),y:(e.clientY-rect.top-rect.height/2)/(geometry.bh/2),clientX:e.clientX,clientY:e.clientY};
    interactive=!!e.target.closest('[data-lm-marker],button,input,select,textarea,a');
    if(interactive||!inside)stopPan();else requestPan();
  };
  const zoom=(next,anchor=null)=>{
    stopPan(false);next=clamp(next,1,2.6);
    if(anchor){const ratio=next/view.zoom;view.x=anchor.x-(anchor.x-view.x)*ratio;view.y=anchor.y-(anchor.y-view.y)*ratio}
    view.zoom=next;apply();
  };
  const setPanel=(name,focus=true)=>{
    inside=false;stopPan();openPanel=expanded?name:null;
    rail.hidden=expanded&&openPanel!=='filter';detail.hidden=expanded&&openPanel!=='detail';
    for(const b of qsa('[data-lm-panel]',workspace))b.setAttribute('aria-expanded',String(openPanel===b.dataset.lmPanel));
    if(focus&&expanded){const target=name?qs('[data-lm-close-panel]',name==='filter'?rail:detail):qs(`[data-lm-panel="${name||workspace.dataset.lastPanel}"]`,workspace);target?.focus({preventScroll:true})}
    if(name)workspace.dataset.lastPanel=name;
  };
  const setExpanded=(next,focus=true)=>{
    if(next===expanded||next&&innerWidth<=1180)return;
    inside=false;stopPan();
    for(const id of pointers.keys())if(board.hasPointerCapture(id))board.releasePointerCapture(id);
    pointers.clear();resetGesture();
    if(next){
      normalGeometry={w:geometry.w,h:geometry.h};
      returnScroll={x:scrollX,y:scrollY};normalMinHeight=page.style.minHeight;
      page.style.minHeight=`${page.getBoundingClientRect().height}px`;
      // Make only the surrounding page inert, never the ancestor of this shell.
      for(let node=workspace;node.parentElement&&node!==document.body;node=node.parentElement){
        for(const sibling of node.parentElement.children)if(sibling!==node&&sibling.tagName!=='DIALOG'){background.push([sibling,sibling.inert]);sibling.inert=true}
      }
      workspace.setAttribute('role','dialog');workspace.setAttribute('aria-modal','true');workspace.setAttribute('aria-label','Maximierte Live-Karte');
    }else{
      for(const [node,inert] of background)node.inert=inert;background=[];
      page.style.minHeight=normalMinHeight;
      for(const attr of ['role','aria-modal','aria-label'])workspace.removeAttribute(attr);
    }
    expanded=next;workspace.classList.toggle('is-expanded',next);
    document.body.classList.toggle('map-expanded',next);document.documentElement.classList.toggle('map-expanded',next);
    qs('#lmExpand',workspace)?.setAttribute('aria-expanded',String(next));setPanel(null,false);
    if(mapVisit?.layer)(next?workspace:document.body).append(mapVisit.layer);
    if(board.isConnected){measure();apply();persist();if(playerSession.follow)centerPlayer()}
    if(!next&&returnScroll)scrollTo({left:returnScroll.x,top:returnScroll.y,behavior:'instant'});
    if(focus)(next?qs('#lmCollapse',workspace):qs('#lmExpand',workspace))?.focus({preventScroll:true});
  };
  // Update existing UI/data nodes while maximized; never render or bind another map.
  const updateExpanded=()=>{
    if(!expanded||disposed||!board.isConnected)return false;
    inside=false;stopPan();current=state();
    const route=current.draft.map(id=>allMarkers().find(m=>m.id===id&&m.scenario===current.scenario)).filter(Boolean);
    const line=route.map(m=>`${markerCoord(m,'mapX')},${markerCoord(m,'mapY')}`).join(' ');
    qs('.lm-route-layer',plane).innerHTML=(line?`<polyline points="${line}" fill="none" vector-effect="non-scaling-stroke"/>`:'')+'<line class="lm-player-start" hidden vector-effect="non-scaling-stroke"/>';
    const existing=new Map(qsa('[data-lm-marker]',plane).map(el=>[el.dataset.lmMarker,el]));
    for(const m of current.visible){
      let el=existing.get(m.id);existing.delete(m.id);
      if(!el){const template=document.createElement('template');template.innerHTML=markerMarkup(m,current);el=template.content.firstElementChild;plane.append(el)}
      el.classList.toggle('active',m.id===current.selectedId);el.title=m.name||'Marker';
      el.style.left=`${markerCoord(m,'mapX')}%`;el.style.top=`${markerCoord(m,'mapY')}%`;
    }
    for(const el of existing.values())el.remove();
    const m=current.selected?.scenario===current.scenario?current.selected:null,nav=qs('.lm-navigator',plane);
    nav.style.setProperty('--nav-x',`${m?markerCoord(m,'mapX'):48}%`);nav.style.setProperty('--nav-y',`${m?markerCoord(m,'mapY'):52}%`);
    qs('span',nav).textContent=m?.name||'NAVIGATOR';
    const routeName=qs('[name="name"]',rail)?.value||'';
    rail.innerHTML=navigationMarkup(current);qs('[name="name"]',rail).value=routeName;
    detail.innerHTML=qs('.lm-panel-title',detail).outerHTML+detailMarkup(current);
    qs('.lm-toolbar>div:first-child b',workspace).textContent=scenarioName(current,current.scenario);
    const counts=[current.scenarios.length,current.visible.length,current.draft.length,customMarkers().filter(m=>m.scenario===current.scenario).length];
    qsa('.lm-command-metrics b',page).forEach((el,i)=>el.textContent=counts[i]);
    updatePlayer();
    return true;
  };
  refreshExpandedMap=updateExpanded;
  listen(workspace,'click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='lmCompanion'){openCompanion();return}
    if(b.id==='lmExpand'){setExpanded(true);return}
    if(b.id==='lmCollapse'){setExpanded(false);return}
    if(b.dataset.lmPanel){setPanel(openPanel===b.dataset.lmPanel?null:b.dataset.lmPanel);return}
    if(b.dataset.lmClosePanel){setPanel(null);return}
    if(b.dataset.lmGo){go(b.dataset.lmGo);return}
    if(b.hasAttribute('data-lm-focus-search')){if(expanded)setPanel('filter',false);qs('#lmSearch')?.focus();return}
    if(b.dataset.lmCatalog){sessionStorage.setItem('jma_open_catalog',b.dataset.lmCatalog);go('database');return}
    if(b.dataset.lmFilterLabel){write('jma_map_q',b.dataset.lmFilterLabel);refresh();return}
    if(b.hasAttribute('data-lm-cat')){write('jma_map_cat',b.dataset.lmCat);refresh();return}
    if(b.id==='lmResetFilters'){write('jma_map_cat','all');write('jma_map_q','');refresh();return}
    if(b.dataset.lmMarker){e.stopPropagation();write('jma_map_selected',b.dataset.lmMarker);refresh();if(expanded)setPanel('detail',false);return}
    if(b.dataset.lmRouteToggle){const id=b.dataset.lmRouteToggle,rows=arr('jma_route_draft');write('jma_route_draft',rows.includes(id)?rows.filter(x=>x!==id):[...rows,id]);refresh();return}
    if(b.dataset.lmRouteRemove){write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==b.dataset.lmRouteRemove));refresh();return}
    if(b.dataset.lmDelete){
      if(!confirm('Eigenen Marker löschen?'))return;const id=b.dataset.lmDelete;
      write('jma_custom_markers',customMarkers().filter(x=>x.id!==id));write('jma_map_selected','');write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==id));
      write('jma_routes',arr('jma_routes').map(r=>({...r,markers:Array.isArray(r.markers)?r.markers.filter(x=>x!==id):[]})));refresh();
    }
  });
  listen(workspace,'change',e=>{if(e.target.id==='lmScenario'){write('jma_map_scenario',e.target.value);write('jma_map_selected','');write('jma_map_cat','all');write('jma_map_q','');refresh()}});
  listen(workspace,'input',e=>{
    if(e.target.id!=='lmSearch')return;
    const input=e.target;write('jma_map_q',input.value);clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{
      if(!input.isConnected)return;
      const focused=document.activeElement===input,start=input.selectionStart,end=input.selectionEnd,direction=input.selectionDirection;
      refresh();const next=qs('#lmSearch');if(focused&&next){next.focus({preventScroll:true});next.setSelectionRange(start,end,direction)}
    },180);
  });
  listen(workspace,'submit',e=>{
    if(e.target.id!=='lmRouteSave')return;
    e.preventDefault();const draft=arr('jma_route_draft'),name=String(new FormData(e.target).get('name')||'').trim();if(!draft.length||!name)return;
    const rows=arr('jma_routes');rows.unshift({id:uid('route'),name,markers:[...draft],created:new Date().toISOString()});
    write('jma_routes',rows);write('jma_route_draft',[]);refresh();toast('Route gespeichert.');
  });
  listen(document,'keydown',e=>{
    if(!expanded||qs('dialog[open]'))return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setExpanded(false);return}
    if(e.key!=='Tab')return;
    const targets=qsa('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]',workspace).filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight&&!el.closest('[hidden]')});
    const first=targets[0],last=targets.at(-1),active=document.activeElement;
    if(e.shiftKey&&(active===first||!workspace.contains(active))){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&(active===last||!workspace.contains(active))){e.preventDefault();first?.focus()}
  },{capture:true});
  listen(rail,'pointerenter',()=>{inside=false;stopPan()});listen(detail,'pointerenter',()=>{inside=false;stopPan()});
  listen(qs('#lmZoomIn'),'click',()=>{zoom(view.zoom+.15);persist()});
  listen(qs('#lmZoomOut'),'click',()=>{zoom(view.zoom-.15);persist()});
  listen(qs('#lmResetView'),'click',()=>{userInteraction();stopPan();view={zoom:1,x:0,y:0};apply();persist()});
  listen(qs('#lmPlace'),'click',e=>{
    stopPan();placing=!placing;e.currentTarget.classList.toggle('active',placing);
    e.currentTarget.textContent=placing?'× ABBRECHEN':'＋ MARKER';board.classList.toggle('placing',placing);
    if(instruction)instruction.textContent=placing?'AUF DIE GEWÜNSCHTE POSITION KLICKEN':navigationHint();
  });
  listen(qs('.lm-toolbar'),'pointerenter',()=>{inside=false;stopPan()});
  listen(board,'wheel',e=>{
    e.preventDefault();
    if(placing||pointers.size||qs('dialog[open]'))return;
    const rect=board.getBoundingClientRect(),pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?geometry.bh:1);
    if(!pixels)return;
    userInteraction();
    zoom(view.zoom*Math.exp(-clamp(pixels,-160,160)*.001),{x:e.clientX-rect.left-rect.width/2,y:e.clientY-rect.top-rect.height/2});
    queuePersist();
  },{passive:false});
  const resetGesture=()=>{
    const pts=[...pointers.values()];
    if(pts.length>=2){const [a,b]=pts;pinch={distance:Math.hypot(b.x-a.x,b.y-a.y),zoom:view.zoom,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,bx:view.x,by:view.y};drag=null}
    else{pinch=null;const a=pts[0];drag=a?{x:a.x,y:a.y,bx:view.x,by:view.y}:null}
    board.classList.toggle('dragging',pointers.size>0);plane.style.willChange=pointers.size?'transform':'';
  };
  listen(board,'dragstart',e=>e.preventDefault());
  listen(board,'pointerenter',updateHover);
  listen(board,'pointerleave',()=>{inside=false;hoverPoint=null;interactive=false;stopPan()});
  listen(board,'pointerdown',e=>{
    stopPan();
    if(placing||e.target.closest('[data-lm-marker]')||e.button>0||qs('dialog[open]'))return;
    userInteraction();e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});board.setPointerCapture(e.pointerId);resetGesture();
  });
  listen(board,'pointermove',e=>{
    updateHover(e);
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pointers.size>=2){
      const [a,b]=[...pointers.values()],rect=board.getBoundingClientRect(),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,next=clamp(pinch.zoom*Math.hypot(b.x-a.x,b.y-a.y)/(pinch.distance||1),1,2.6),ratio=next/pinch.zoom;
      const ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
      view.x=cx-ox-(pinch.cx-ox-pinch.bx)*ratio;view.y=cy-oy-(pinch.cy-oy-pinch.by)*ratio;view.zoom=next;apply();
    }else if(drag){view.x=drag.bx+e.clientX-drag.x;view.y=drag.by+e.clientY-drag.y;apply()}
    queuePersist();
  });
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])listen(board,ev,e=>{
    if(!pointers.delete(e.pointerId))return;
    resetGesture();persist();
    if(ev==='pointerup'&&!pointers.size){updateHover(e);requestPan()}
    else if(ev!=='pointerup'){inside=false;stopPan()}
  });
  listen(board,'click',e=>{
    if(!placing||e.target.closest('[data-lm-marker]'))return;
    stopPan();const rect=plane.getBoundingClientRect(),mapX=(e.clientX-rect.left)/rect.width*100,mapY=(e.clientY-rect.top)/rect.height*100;
    if(mapX<0||mapX>100||mapY<0||mapY>100)return;
    placing=false;board.classList.remove('placing');qs('#lmPlace')?.classList.remove('active');
    if(qs('#lmPlace'))qs('#lmPlace').textContent='＋ MARKER';
    if(instruction)instruction.textContent=navigationHint();
    openMarkerDialog(mapX,mapY,current.scenario);
  });
  const resize=()=>{if(expanded&&innerWidth<=1180)setExpanded(false);measure();apply();queuePersist();stopPan();if(instruction&&!placing)instruction.textContent=navigationHint();updatePlayer()};
  listen(image,'load',resize,{once:true});
  const observer=new ResizeObserver(resize);observer.observe(board);
  // A render disposes synchronously; this also catches DOM removal by other code.
  const removal=new MutationObserver(()=>{if(!board.isConnected)dispose()});removal.observe(qs('#app'),{childList:true,subtree:true});
  const dispose=()=>{
    if(disposed)return;
    if(expanded)setExpanded(false,false);
    stopPan();disposed=true;events.abort();observer.disconnect();removal.disconnect();clearTimeout(searchTimer);
    unsubscribeTelemetry?.();companionDialog?.remove();calibrationDialog?.remove();
    pointers.clear();board.classList.remove('dragging');plane.style.willChange='';
    if(disposeMapView===dispose)disposeMapView=null;
    if(refreshExpandedMap===updateExpanded)refreshExpandedMap=null;
  };
  disposeMapView=dispose;
  listen(window,'pagehide',dispose);
  listen(window,'blur',()=>{inside=false;stopPan();pointers.clear();resetGesture()});
  listen(document,'visibilitychange',()=>{if(document.hidden){inside=false;stopPan();persist()}});
  listen(window,'scroll',()=>{inside=false;stopPan()},{passive:true});
  listen(desktop,'change',()=>{inside=false;stopPan();if(instruction&&!placing)instruction.textContent=navigationHint()});
  measure();apply();queuePersist();
  const unsubscribeTelemetry=telemetry?.subscribe((value,info)=>{sample=value;telemetryInfo=info;updatePlayer()});
}


globalThis.FULL_ROUTE_RENDERERS={...(globalThis.FULL_ROUTE_RENDERERS||{}),map:renderLiveMap,'live-map':renderLiveMap};
globalThis.FULL_ROUTE_BINDERS={...(globalThis.FULL_ROUTE_BINDERS||{}),map:bindLiveMap,'live-map':bindLiveMap};
})();
