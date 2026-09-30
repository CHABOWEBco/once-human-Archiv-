(()=>{
'use strict';
const AD=()=>globalThis.ARCHIVE_DATA||{};
const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const read=(k,f=null)=>globalThis.JMA_STORE.read(k,f);
const write=(k,v)=>globalThis.JMA_STORE.write(k,v);
const arr=(k)=>{const v=read(k,[]);return Array.isArray(v)?v:[]};
const set=(k)=>new Set(arr(k));
const putSet=(k,s)=>write(k,[...s]);
const catalog=()=>Array.isArray(globalThis.CATALOG_DATA?.entries)?globalThis.CATALOG_DATA.entries:[];
const account=()=>globalThis.JMA_AUTH?.getAccount?.()||null;
const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const fmt=d=>{try{return new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}catch{return d||'—'}};
const go=id=>{location.hash=`#/${id}`};
const refresh=()=>globalThis.JMA_RENDER?.();
const inputRefresh=(key,value,selector,delay=260)=>{write(key,value);clearTimeout(globalThis.__rfInputRefresh);globalThis.__rfInputRefresh=setTimeout(()=>{refresh();setTimeout(()=>{const el=qs(selector);if(el){el.focus();const n=el.value?.length||0;try{el.setSelectionRange(n,n)}catch{}}},0)},delay)};
const toast=msg=>{const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(globalThis.__rfToast);globalThis.__rfToast=setTimeout(()=>t.classList.remove('show'),2200)};
const hero=(k,t,p,side='')=>`<header class="rf-hero"><div><div class="section-kicker">${esc(k)}</div><h1>${esc(t)}</h1><p>${esc(p)}</p></div>${side?`<aside>${side}</aside>`:''}</header>`;
const metrics=items=>`<div class="rf-metrics">${items.map(([n,l])=>`<span><b>${esc(n)}</b><small>${esc(l)}</small></span>`).join('')}</div>`;
const empty=t=>`<div class="rf-empty"><b>${esc(t)}</b><span>Hier gibt es im aktuellen lokalen Stand noch nichts anzuzeigen.</span></div>`;
const btnLink=(route,label,cls='ghost-btn')=>`<button class="${cls}" type="button" data-rf-go="${esc(route)}">${esc(label)}</button>`;
const on=(sel,ev,fn)=>qs(sel)?.addEventListener(ev,fn);
const navBinds=()=>{qsa('[data-rf-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.rfGo)));qsa('[data-rf-profile-collection]').forEach(b=>b.addEventListener('click',()=>{write('jma_profile_view','collection');go('profile')}))};

function renderDashboard(){
 const a=account(), fav=set('jma_favorites'), hunt=set('jma_hunt'), builds=arr('jma_saved_builds'), routes=arr('jma_routes'), plans=arr('jma_plans');
 return `<section class="rf-page dashboard-page">${hero('KOMMANDOZENTRALE','DEIN ARCHIV',a?`Willkommen zurück, ${a.name||a.email}. Deine lokalen Werkzeuge laufen in einem gemeinsamen Arbeitsbereich.`:'Persönlicher Überblick über Sammlung, Jagdliste, Builds und Einsätze. Für Kontodaten kannst du dich über die bestehende Anmeldung registrieren.')}
 ${metrics([[fav.size,'Favoriten'],[hunt.size,'Jagdziel(e)'],[builds.length,'gespeicherte Builds'],[routes.length,'Routen'],[plans.length,'Einsatzpläne']])}
 <div class="rf-command-grid"><article class="rf-feature"><span>◎</span><small>NÄCHSTER SCHRITT</small><h2>${hunt.size?'Jagdliste abarbeiten':'Erstes Jagdziel setzen'}</h2><p>${hunt.size?'Öffne deine markierten Katalogziele und pflege Priorität bzw. Status.':'Übernimm aus der Datenbank einen Eintrag direkt in deine Jagdliste.'}</p>${btnLink(hunt.size?'hunt':'database',hunt.size?'JAGDLISTE ÖFFNEN':'DATENBANK ÖFFNEN','cyan-btn compact')}</article>
 <article class="rf-panel"><div class="rf-panel-head"><b>WERKZEUGE</b><small>dein Arbeitsraum</small></div><div class="rf-action-stack">${btnLink('map','⌖ INTERAKTIVE KARTE')}${btnLink('builds','⚒ BUILD-WERKSTATT')}${btnLink('planner','◷ EINSATZPLANER')}<button class="ghost-btn" type="button" data-rf-profile-collection>★ MEINE SAMMLUNG</button></div></article>
 <article class="rf-panel wide"><div class="rf-panel-head"><b>ARCHIVSTATUS</b><small>27 feste Routen</small></div><div class="rf-progress-row"><span>Startseite</span><i><em style="width:100%"></em></i><b>aktiv</b></div><div class="rf-progress-row"><span>Datenbank</span><i><em style="width:100%"></em></i><b>aktiv</b></div><div class="rf-progress-row"><span>Persönlicher Zustand</span><i><em style="width:${a?100:55}%"></em></i><b>${a?'verbunden':'lokal'}</b></div></article></div></section>`;
}

function renderNews(){
 const rows=AD().seed?.news||[]; const cat=read('jma_news_filter','all'); const filtered=cat==='all'?rows:rows.filter(x=>x.category===cat); const cats=[...new Set(rows.map(x=>x.category))];
 const feature=filtered.find(x=>x.featured)||filtered[0];
 return `<section class="rf-page news-page">${hero('ARCHIV // SIGNAL','NEUIGKEITEN','Projektmeldungen und dokumentierte Archiv-Updates aus dem erhaltenen Projektstand.')}
 <div class="rf-tabs"><button class="${cat==='all'?'active':''}" data-news-cat="all">ALLE</button>${cats.map(c=>`<button class="${cat===c?'active':''}" data-news-cat="${esc(c)}">${esc(c.toUpperCase())}</button>`).join('')}</div>
 ${feature?`<article class="rf-news-feature"><div class="visual"></div><div><small>${esc(feature.category)} · ${fmt(feature.date)}</small><h2>${esc(feature.title)}</h2><p>${esc(feature.summary)}</p><button class="cyan-btn compact" type="button" data-news-open="${esc(feature.id)}">MELDUNG LESEN →</button></div></article>`:''}
 <div class="rf-news-list">${filtered.map(n=>`<article><small>${fmt(n.date)} · ${esc(n.category)}</small><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><button type="button" data-news-open="${esc(n.id)}">DETAILS</button><div class="rf-news-body" data-news-body="${esc(n.id)}" hidden>${esc(n.body)}</div></article>`).join('')}</div></section>`;
}
function bindNews(){navBinds();qsa('[data-news-cat]').forEach(b=>b.onclick=()=>{write('jma_news_filter',b.dataset.newsCat);refresh()});qsa('[data-news-open]').forEach(b=>b.onclick=()=>{const x=qs(`[data-news-body="${CSS.escape(b.dataset.newsOpen)}"]`);if(x){x.hidden=!x.hidden;b.textContent=x.hidden?'DETAILS':'SCHLIESSEN'}})}

const mapCustom=()=>arr('jma_custom_markers');
const allMarkers=()=>[...(AD().map?.markers||[]),...mapCustom().map(x=>({...x,custom:true}))];
function mapSelected(){return read('jma_map_selected','')}
const mapPreviewCategories=[
  ['⌁','Routen & Wege'],
  ['◈','Teleportationspunkte'],
  ['⌂','Siedlungen & Lager'],
  ['⌖','Wichtige Orte'],
  ['◉','Events'],
  ['◎','Abweichler'],
  ['◇','Ressourcen'],
  ['▣','Kisten & Beute'],
  ['✧','Sammlerstücke'],
  ['•••','Sonstiges']
];
const mapResourcePreview=['Pflanzen','Erze & Mineralien','Tiere','Spezialressourcen'];

function mapAppDetail(m,scenarioName){
  if(!m){
    return `<div class="map-app-detail-cover"><img src="./assets/reference/feature-map.webp" alt=""><span>KARTENARCHIV // BEREIT</span></div>
      <div class="map-app-detail-copy"><small>DETAILANSICHT</small><h2>GEBIET AUSWÄHLEN</h2><p>Wähle später einen Kartenbereich oder vorhandenen Marker, um geprüfte Informationen an dieser Stelle anzuzeigen.</p></div>
      <div class="map-app-detail-tabs" aria-label="Detailbereiche"><button class="active" type="button">▦<span>Übersicht</span></button><button type="button" data-rf-go="routes">⌁<span>Routen</span></button><button type="button" data-map-filter-label="Ressourcen">◇<span>Ressourcen</span></button><button type="button" data-map-filter-label="Abweichler">◎<span>Abweichler</span></button></div>
      <section class="map-app-detail-section"><header><b>WICHTIGE INFOS</b></header><div class="map-app-empty-lines"><span>Keine Gebietsdaten ausgewählt.</span><span>Keine erfundenen Werte hinterlegt.</span></div></section>
      <section class="map-app-detail-section"><header><b>RESSOURCEN</b></header><div class="map-app-detail-placeholder">Verifizierte Ressourcendaten werden später angebunden.</div></section>
      <div class="map-app-detail-actions"><button type="button" class="cyan-btn compact" id="mapChoose">MARKER AUSWÄHLEN →</button>${btnLink('routes','ROUTEN VERWALTEN')}</div>`;
  }
  const coords=m.gameX||m.gameY?`X ${esc(m.gameX||'—')} / Y ${esc(m.gameY||'—')}`:'noch nicht hinterlegt';
  return `<div class="map-app-detail-cover"><img src="./assets/reference/feature-map.webp" alt=""><span>MARKER // AUSGEWÄHLT</span></div>
    <div class="map-app-detail-copy"><small>${esc(m.category||'MARKER')}</small><h2>${esc(m.name)}</h2><p>${esc(m.note||'Für diesen Marker ist noch keine zusätzliche Beschreibung hinterlegt.')}</p></div>
    <div class="map-app-detail-tabs" aria-label="Detailbereiche"><button class="active" type="button">▦<span>Übersicht</span></button><button type="button" data-rf-go="routes">⌁<span>Routen</span></button><button type="button" data-map-filter-label="Ressourcen">◇<span>Ressourcen</span></button><button type="button" data-map-filter-label="Abweichler">◎<span>Abweichler</span></button></div>
    <section class="map-app-detail-section"><header><b>WICHTIGE INFOS</b></header><dl class="map-app-kv"><div><dt>Szenario</dt><dd>${esc(scenarioName||m.scenario)}</dd></div><div><dt>Kategorie</dt><dd>${esc(m.category||'Marker')}</dd></div><div><dt>Koordinaten</dt><dd>${coords}</dd></div><div><dt>Prüfstatus</dt><dd>${esc(m.verified||'lokal')}</dd></div></dl></section>
    <section class="map-app-detail-section"><header><b>RESSOURCEN</b></header><div class="map-app-detail-placeholder">Keine verifizierten Ressourcendaten für diesen Marker hinterlegt.</div></section>
    <div class="map-app-detail-actions"><button type="button" class="cyan-btn compact" data-map-route-add="${esc(m.id)}">＋ ZUR ROUTE</button>${m.custom?`<button type="button" class="ghost-btn" data-map-delete="${esc(m.id)}">MARKER LÖSCHEN</button>`:btnLink('routes','ROUTEN VERWALTEN')}</div>`;
}

function renderMap(){
  const scenarios=AD().map?.scenarios||[],scenario=read('jma_map_scenario','way-of-winter'),q=read('jma_map_q',''),cat=read('jma_map_cat','all');
  const candidates=allMarkers().filter(m=>m.scenario===scenario),cats=[...new Set(candidates.map(x=>x.category).filter(Boolean))];
  const markers=candidates.filter(m=>(cat==='all'||m.category===cat)&&(!q||`${m.name} ${m.category} ${m.note} ${m.location}`.toLowerCase().includes(q.toLowerCase())));
  const selected=allMarkers().find(x=>x.id===mapSelected()),storedView=read('jma_map_view',{zoom:1,x:0,y:0}),view={zoom:Math.max(1,Math.min(2.4,Number(storedView.zoom)||1)),x:Number(storedView.x)||0,y:Number(storedView.y)||0}
  const scenarioName=scenarios.find(s=>s.id===scenario)?.name||scenario;
  const routeCount=arr('jma_routes').length;
  return `<section class="rf-page map-page map-app-page">
    <header class="map-app-hero">
      <div class="map-app-hero-copy">
        <div class="map-app-kicker"><span>✦</span> KARTENZENTRALE // INTERN</div>
        <h1>INTERAKTIVE<br><span>KARTE</span></h1>
        <p>Szenarioebenen, vorhandene Marker und gespeicherte Routen in einer kompakten Kartenoberfläche. Ziehe die Karte mit Maus oder Touch, zoome und verbinde echte Fundorte zu deinen eigenen Farmrouten.</p>
        <div class="map-app-stats">
          <article><i>▦</i><div><b>${scenarios.length}</b><span>SZENARIEN</span><small>vorhandener Projektstand</small></div></article>
          <article><i>⌖</i><div><b>${allMarkers().length}</b><span>MARKER</span><small>vorhandene Einträge</small></div></article>
          <article><i>◉</i><div><b>${markers.length}</b><span>SICHTBAR</span><small>aktuelle Auswahl</small></div></article>
          <article><i>⌁</i><div><b>${routeCount}</b><span>ROUTEN</span><small>lokal gespeichert</small></div></article>
        </div>
      </div>
    </header>

    <div class="map-app-shell">
      <aside class="map-app-sidebar">
        <div class="map-app-side-tabs"><button type="button" class="active"><span>▦</span>Marker & Filter</button><button type="button" data-rf-go="routes"><span>▤</span>Meine Karten</button></div>
        <label class="map-app-side-search"><span>⌕</span><input id="mapSideSearch" value="${esc(q)}" placeholder="Marker suchen …" aria-label="Markerfilter durchsuchen"></label>
        <section class="map-app-filter-list">
          <header><div><small>FILTER</small><b>MARKER-KATEGORIEN</b></div><span>LIVE FILTER</span></header>
          ${['all',...cats].map(label=>`<button type="button" data-map-cat="${esc(label)}" class="${label===cat?'active':''}"><i>⌖</i><span>${label==='all'?'Alle Marker':esc(label)}</span><em>${candidates.filter(x=>label==='all'||x.category===label).length}</em></button>`).join('')}
        </section>
        <button id="mapResetFilters" class="map-app-reset-filter" type="button"><span>↻</span> FILTER ZURÜCKSETZEN</button>
      </aside>

      <div class="map-app-center" role="region" aria-label="Interaktive Weltkarte">
        <div class="map-app-toolbar">
          <label><small>SZENARIO</small><select id="mapScenario">${scenarios.map(s=>`<option value="${esc(s.id)}" ${s.id===scenario?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
          <label class="map-app-search"><small>SUCHE</small><span>⌕</span><input id="mapSearch" value="${esc(q)}" placeholder="Silo, Kategorie, Notiz …"></label>
          <label><small>KATEGORIE</small><select id="mapCategory"><option value="all">Alle</option>${cats.map(c=>`<option ${c===cat?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
          <button class="map-app-tool-button" type="button" id="mapPlace" aria-label="Eigenen Marker setzen">+</button>
          <div class="map-app-zoom"><button id="mapZoomOut" type="button" aria-label="Karte verkleinern">−</button><b>${Math.round((view.zoom||1)*100)}%</b><button id="mapZoomIn" type="button" aria-label="Karte vergrößern">+</button><button id="mapResetView" type="button">RESET</button></div>
        </div>

        <div class="map-app-board" id="mapBoard">
          <div class="map-app-plane" id="mapPlane">
            <svg class="map-route-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${arr('jma_route_draft').map(id=>allMarkers().find(m=>m.id===id&&m.scenario===scenario)).filter(Boolean).map(m=>`${m.mapX},${m.mapY}`).join(' ')}" fill="none" stroke="#45e3f1" stroke-width=".3"/></svg><img class="map-app-image" src="./assets/map/once-human-world-map.webp" alt="Once Human Weltkarte" draggable="false">
            ${markers.map(m=>`<button class="map-app-marker ${m.id===mapSelected()?'active':''} ${m.custom?'custom':''}" type="button" title="${esc(m.name)}" data-map-marker="${esc(m.id)}" style="left:${Number.isFinite(Number(m.mapX))?Number(m.mapX):50}%;top:${Number.isFinite(Number(m.mapY))?Number(m.mapY):50}%"><span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/></svg></span></button>`).join('')}
          </div>
          <div class="map-app-compass" aria-hidden="true"><b>N</b><span>✥</span><small>W&nbsp;&nbsp;&nbsp;E</small></div>
          <div class="map-app-scale" aria-hidden="true"><span></span><small>KARTENANSICHT // 1536×1024</small></div>
          <div class="map-app-help">Ziehen = verschieben · Mausrad / ± = zoomen</div>
        </div>
      </div>

      <aside class="map-app-detail" id="mapDetail">${mapAppDetail(selected,scenarioName)}</aside>
    </div>
  </section>`;
}

function bindMap(){navBinds();on('#mapScenario','change',e=>{write('jma_map_scenario',e.target.value);write('jma_map_selected','');write('jma_map_cat','all');write('jma_map_q','');refresh()});on('#mapSearch','input',e=>inputRefresh('jma_map_q',e.target.value,'#mapSearch'));qsa('[data-map-cat]').forEach(b=>b.onclick=()=>{write('jma_map_cat',b.dataset.mapCat);refresh()});on('#mapResetFilters','click',()=>{write('jma_map_cat','all');write('jma_map_q','');refresh()});on('#mapSideSearch','input',e=>inputRefresh('jma_map_q',e.target.value,'#mapSideSearch'));on('#mapCategory','change',e=>{write('jma_map_cat',e.target.value);refresh()});on('#mapChoose','click',()=>qs('#mapSearch').focus());qsa('[data-map-filter-label]').forEach(b=>b.onclick=()=>{write('jma_map_q',b.dataset.mapFilterLabel);refresh()});on('#mapLabels','change',e=>{write('jma_map_labels',e.target.checked);refresh()});qsa('[data-map-marker]').forEach(b=>b.onclick=e=>{e.stopPropagation();write('jma_map_selected',b.dataset.mapMarker);refresh()});qsa('[data-map-route-add]').forEach(b=>b.onclick=()=>{const rows=arr('jma_route_draft');if(!rows.includes(b.dataset.mapRouteAdd))rows.push(b.dataset.mapRouteAdd);write('jma_route_draft',rows);refresh()});qsa('[data-map-route-remove]').forEach(b=>b.onclick=()=>{write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==b.dataset.mapRouteRemove));refresh()});qsa('[data-map-delete]').forEach(b=>b.onclick=()=>{if(!confirm('Eigenen Marker löschen?'))return;write('jma_custom_markers',mapCustom().filter(x=>x.id!==b.dataset.mapDelete));write('jma_map_selected','');write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==b.dataset.mapDelete));write('jma_routes',arr('jma_routes').map(r=>({...r,markers:r.markers.filter(id=>id!==b.dataset.mapDelete)})));refresh()});qsa('[data-map-catalog]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('jma_open_catalog',b.dataset.mapCatalog);go('database')});
const board=qs('#mapBoard'),plane=qs('#mapPlane'),image=qs('.map-app-image');let placing=false,drag=null,saved=read('jma_map_view',{zoom:1,x:0,y:0}),v={zoom:Math.max(1,Math.min(2.4,+saved.zoom||1)),x:+saved.x||0,y:+saved.y||0};const apply=()=>{if(!board.isConnected)return;const ratio=image.naturalWidth/image.naturalHeight||1.5,w=Math.max(board.clientWidth,board.clientHeight*ratio),h=w/ratio,maxX=Math.max(0,(w*v.zoom-board.clientWidth)/2),maxY=Math.max(0,(h*v.zoom-board.clientHeight)/2);v.x=Math.min(maxX,Math.max(-maxX,v.x));v.y=Math.min(maxY,Math.max(-maxY,v.y));plane.style.width=w+'px';plane.style.height=h+'px';plane.style.left=`calc(50% + ${v.x}px)`;plane.style.top=`calc(50% + ${v.y}px)`;plane.style.transform=`translate(-50%,-50%) scale(${v.zoom})`;plane.querySelectorAll('[data-map-marker]').forEach(m=>m.style.transform=`translate(-50%,-50%) scale(${1/v.zoom})`);qs('.map-app-zoom b').textContent=Math.round(v.zoom*100)+'%';write('jma_map_view',v)};const zoom=delta=>{v.zoom=Math.max(1,Math.min(2.4,v.zoom+delta));apply()};on('#mapZoomIn','click',()=>zoom(.15));on('#mapZoomOut','click',()=>zoom(-.15));on('#mapResetView','click',()=>{v={zoom:1,x:0,y:0};apply()});on('#mapPlace','click',()=>{placing=!placing;qs('#mapPlace').textContent=placing?'×':'＋';qs('#mapPlace').title=placing?'Klicke auf die Position für deinen Marker':'Eigenen Marker setzen';board.classList.toggle('placing',placing)});board.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.1:-.1)},{passive:false});const pointers=new Map();let pinch=null;const gesture=()=>{const points=[...pointers.values()];if(points.length>=2){const [a,b]=points;pinch={distance:Math.hypot(b.x-a.x,b.y-a.y),zoom:v.zoom,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,bx:v.x,by:v.y};drag=null}else{pinch=null;const a=points[0];drag=a?{x:a.x,y:a.y,bx:v.x,by:v.y}:null}};board.addEventListener('pointerdown',e=>{if(placing||e.target.closest('[data-map-marker]')||e.button>0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});board.setPointerCapture(e.pointerId);gesture()});board.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch){const [a,b]=[...pointers.values()],rect=board.getBoundingClientRect(),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,next=Math.max(1,Math.min(2.4,pinch.zoom*Math.hypot(b.x-a.x,b.y-a.y)/(pinch.distance||1))),ratio=next/pinch.zoom;v.x=cx-rect.left-rect.width/2-(pinch.cx-rect.left-rect.width/2-pinch.bx)*ratio;v.y=cy-rect.top-rect.height/2-(pinch.cy-rect.top-rect.height/2-pinch.by)*ratio;v.zoom=next;apply()}else if(drag){v.x=drag.bx+e.clientX-drag.x;v.y=drag.by+e.clientY-drag.y;apply()}});for(const ev of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(ev,e=>{pointers.delete(e.pointerId);gesture()});board.addEventListener('click',e=>{if(!placing||e.target.closest('[data-map-marker]'))return;const rect=plane.getBoundingClientRect(),mapX=(e.clientX-rect.left)/rect.width*100,mapY=(e.clientY-rect.top)/rect.height*100;if(mapX<0||mapX>100||mapY<0||mapY>100)return;placing=false;let dialog=qs('#markerDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='markerDialog';document.body.appendChild(dialog)}dialog.innerHTML=`<form id="markerForm"><button type="button" class="dialog-close" aria-label="Schließen">×</button><h2>EIGENER MARKER</h2><label>NAME<input name="name" required maxlength="80"></label><label>KATEGORIE<input name="category" required value="Eigener Fund" maxlength="60"></label><label>NOTIZ<textarea name="note" maxlength="1000"></textarea></label><label>SPIEL X (optional)<input name="gameX" type="number"></label><label>SPIEL Y (optional)<input name="gameY" type="number"></label><button class="cyan-btn">MARKER SPEICHERN</button></form>`;dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),name=String(fd.get('name')).trim(),category=String(fd.get('category')).trim();if(!name||!category)return;const marker={id:uid('marker'),name,category,note:String(fd.get('note')).trim(),gameX:fd.get('gameX'),gameY:fd.get('gameY'),mapX,mapY,scenario:read('jma_map_scenario','way-of-winter'),created:new Date().toISOString(),catalogIds:[]};write('jma_custom_markers',[...mapCustom(),marker]);write('jma_map_selected',marker.id);dialog.close();refresh()};dialog.showModal()});image.addEventListener('load',apply,{once:true});const observer=new ResizeObserver(()=>{if(board.isConnected)apply();else observer.disconnect()});observer.observe(board);apply()}


function renderHunt(){const ids=[...set('jma_hunt')],meta=read('jma_hunt_meta',{});const rows=ids.map(id=>catalog().find(x=>x.id===id)).filter(Boolean);return `<section class="rf-page hunt-page">${hero('PERSÖNLICH // ZIELE','JAGDLISTE','Katalogziele priorisieren, als erledigt markieren oder direkt zur Datenbank zurückspringen.',metrics([[rows.length,'aktive Einträge'],[rows.filter(x=>meta[x.id]?.done).length,'erledigt']]))}<div class="rf-hunt-list">${rows.map(x=>`<article class="${meta[x.id]?.done?'done':''}"><div><small>${esc(x.kind||x.category)}</small><h3>${esc(x.name_de)}</h3><p>${esc(x.acquisition||x.description||'')}</p></div><label>PRIORITÄT<select data-hunt-priority="${esc(x.id)}"><option ${meta[x.id]?.priority==='Hoch'?'selected':''}>Hoch</option><option ${!meta[x.id]?.priority||meta[x.id]?.priority==='Normal'?'selected':''}>Normal</option><option ${meta[x.id]?.priority==='Niedrig'?'selected':''}>Niedrig</option></select></label><div class="actions"><button type="button" data-hunt-done="${esc(x.id)}">${meta[x.id]?.done?'↺ ÖFFNEN':'✓ ERLEDIGT'}</button><button type="button" data-hunt-remove="${esc(x.id)}">ENTFERNEN</button></div></article>`).join('')||empty('Keine Jagdziele')}<div class="rf-inline-cta">${btnLink('database','＋ AUS DATENBANK HINZUFÜGEN','cyan-btn compact')}</div></div></section>`}
function bindHunt(){navBinds();qsa('[data-hunt-priority]').forEach(s=>s.onchange=()=>{const m=read('jma_hunt_meta',{});m[s.dataset.huntPriority]={...(m[s.dataset.huntPriority]||{}),priority:s.value};write('jma_hunt_meta',m);toast('Priorität gespeichert.')});qsa('[data-hunt-done]').forEach(b=>b.onclick=()=>{const m=read('jma_hunt_meta',{}),id=b.dataset.huntDone;m[id]={...(m[id]||{}),done:!m[id]?.done};write('jma_hunt_meta',m);refresh()});qsa('[data-hunt-remove]').forEach(b=>b.onclick=()=>{const s=set('jma_hunt');s.delete(b.dataset.huntRemove);putSet('jma_hunt',s);refresh()})}

function renderRoutes(){const saved=arr('jma_routes'),draft=arr('jma_route_draft');return `<section class="rf-page routes-page">${hero('KARTE // PLANUNG','FARMROUTEN','Marker zu eigenen Routen verbinden. Gespeicherte Routen bleiben lokal im Browser und öffnen ihre Stationen wieder auf der Karte.')}
 <div class="rf-routes-grid"><section class="rf-panel"><div class="rf-panel-head"><b>AKTUELLER ENTWURF</b><small>${draft.length} Stationen</small></div><div class="rf-route-steps">${draft.map((id,i)=>{const m=allMarkers().find(x=>x.id===id);return m?`<div><b>${i+1}</b><span>${esc(m.name)}</span><button data-route-step-remove="${esc(id)}">×</button></div>`:''}).join('')||empty('Entwurf leer')}</div><form id="routeSaveForm"><input name="name" placeholder="Routenname" required><button class="cyan-btn compact" type="submit" ${draft.length?'':'disabled'}>ROUTE SPEICHERN</button></form>${btnLink('map','⌖ MARKER AUF KARTE WÄHLEN')}</section>
 <section class="rf-panel"><div class="rf-panel-head"><b>GESPEICHERTE ROUTEN</b><small>${saved.length}</small></div><div class="rf-saved-list">${saved.map(r=>`<article><div><small>${fmt(r.created)}</small><h3>${esc(r.name)}</h3><p>${r.markers.length} Stationen</p></div><div><button data-route-open="${esc(r.id)}">ÖFFNEN</button><button data-route-delete="${esc(r.id)}">LÖSCHEN</button></div></article>`).join('')||empty('Noch keine Route gespeichert')}</div></section></div></section>`}
function bindRoutes(){navBinds();qsa('[data-route-step-remove]').forEach(b=>b.onclick=()=>{write('jma_route_draft',arr('jma_route_draft').filter(x=>x!==b.dataset.routeStepRemove));refresh()});on('#routeSaveForm','submit',e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name').trim(),draft=arr('jma_route_draft');if(!name||!draft.length)return;const rows=arr('jma_routes');rows.unshift({id:uid('route'),name,markers:draft,created:new Date().toISOString()});write('jma_routes',rows);write('jma_route_draft',[]);toast('Route gespeichert.');refresh()});qsa('[data-route-delete]').forEach(b=>b.onclick=()=>{write('jma_routes',arr('jma_routes').filter(x=>x.id!==b.dataset.routeDelete));refresh()});qsa('[data-route-open]').forEach(b=>b.onclick=()=>{const r=arr('jma_routes').find(x=>x.id===b.dataset.routeOpen);if(!r)return;write('jma_route_draft',r.markers);if(r.markers[0]){write('jma_map_selected',r.markers[0]);const m=allMarkers().find(x=>x.id===r.markers[0]);if(m)write('jma_map_scenario',m.scenario)}write('jma_map_q','');write('jma_map_cat','all');go('map')})}

function renderPlanner(){const plans=arr('jma_plans'),hunts=[...set('jma_hunt')].map(id=>catalog().find(x=>x.id===id)).filter(Boolean),builds=arr('jma_saved_builds'),routes=arr('jma_routes');return `<section class="rf-page planner-page">${hero('SESSION // PLANUNG','EINSATZPLANER','Eine Spielsitzung aus Jagdzielen, Build und Kartenroute zusammensetzen und lokal speichern.')}
 <div class="rf-planner-layout"><form class="rf-panel rf-plan-form" id="planForm"><div class="rf-panel-head"><b>NEUER EINSATZ</b><small>lokaler Plan</small></div><label>TITEL<input name="title" required placeholder="z. B. Winter-Silos"></label><div class="rf-form-pair"><label>DATUM<input type="date" name="date"></label><label>FOKUS<select name="focus"><option>Farm</option><option>Boss</option><option>Erkundung</option><option>Tech</option><option>Community</option></select></label></div><label>JAGDZIEL<select name="hunt"><option value="">Keins</option>${hunts.map(x=>`<option value="${esc(x.id)}">${esc(x.name_de)}</option>`).join('')}</select></label><label>BUILD<select name="build"><option value="">Kein Build</option>${builds.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>ROUTE<select name="route"><option value="">Keine Route</option>${routes.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>NOTIZ<textarea name="note" placeholder="Materialien, Gruppe, Reihenfolge …"></textarea></label><button class="cyan-btn compact" type="submit">EINSATZ SPEICHERN</button></form>
 <section class="rf-panel"><div class="rf-panel-head"><b>GEPLANTE EINSÄTZE</b><small>${plans.length}</small></div><div class="rf-plan-list">${plans.map(p=>`<article><div><small>${p.date?fmt(p.date):'ohne Datum'} · ${esc(p.focus)}</small><h3>${esc(p.title)}</h3><p>${esc(p.note||'')}</p><div class="rf-chips">${p.hunt?'<span>◎ Jagdziel</span>':''}${p.build?'<span>⚒ Build</span>':''}${p.route?'<span>⌖ Route</span>':''}</div></div><button data-plan-delete="${esc(p.id)}">×</button></article>`).join('')||empty('Noch kein Einsatz geplant')}</div></section></div></section>`}
function bindPlanner(){navBinds();on('#planForm','submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),rows=arr('jma_plans');rows.unshift({id:uid('plan'),title:String(fd.get('title')).trim(),date:fd.get('date'),focus:fd.get('focus'),hunt:fd.get('hunt'),build:fd.get('build'),route:fd.get('route'),note:String(fd.get('note')||'').trim(),created:new Date().toISOString()});write('jma_plans',rows);toast('Einsatzplan gespeichert.');refresh()});qsa('[data-plan-delete]').forEach(b=>b.onclick=()=>{write('jma_plans',arr('jma_plans').filter(x=>x.id!==b.dataset.planDelete));refresh()})}

function renderGuides(){const guides=AD().guides?.guides||[],q=read('jma_guides_q',''),cat=read('jma_guides_cat','all'),cats=[...new Set(guides.map(g=>g.category))],rows=guides.filter(g=>(cat==='all'||g.category===cat)&&(!q||`${g.title} ${g.summary} ${g.chapters.map(c=>c.title+' '+c.text).join(' ')}`.toLowerCase().includes(q.toLowerCase())));return `<section class="rf-page guides-page">${hero('WISSEN // SCHRITT FÜR SCHRITT','GUIDES','Onboarding- und Funktionsguides aus dem vorhandenen Projektstand – mit Kapiteln statt reiner Linkliste.',metrics([[guides.length,'Guides'],[guides.reduce((a,g)=>a+g.chapters.length,0),'Kapitel']]))}<div class="rf-guide-toolbar"><input id="guideSearch" value="${esc(q)}" placeholder="Guide oder Kapitel suchen …"><select id="guideCategory"><option value="all">Alle Kategorien</option>${cats.map(c=>`<option ${c===cat?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="rf-guide-grid">${rows.map((g,i)=>`<article><small>${esc(g.category)}</small><h2>${esc(g.title)}</h2><p>${esc(g.summary)}</p><button class="cyan-btn compact" type="button" data-guide-toggle="${i}">KAPITEL ANZEIGEN</button><div class="rf-guide-chapters" data-guide-chapters="${i}" hidden>${g.chapters.map(c=>`<section><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></section>`).join('')}</div></article>`).join('')||empty('Keine Guides gefunden')}</div></section>`}
function bindGuides(){navBinds();on('#guideSearch','input',e=>inputRefresh('jma_guides_q',e.target.value,'#guideSearch'));on('#guideCategory','change',e=>{write('jma_guides_cat',e.target.value);refresh()});qsa('[data-guide-toggle]').forEach(b=>b.onclick=()=>{const p=qs(`[data-guide-chapters="${b.dataset.guideToggle}"]`);p.hidden=!p.hidden;b.textContent=p.hidden?'KAPITEL ANZEIGEN':'KAPITEL SCHLIESSEN'})}

function renderPatchwatch(){const rows=catalog(),today=new Date(),todayDay=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()),stats={};rows.forEach(x=>stats[x.status]=(stats[x.status]||0)+1);const review=rows.map(x=>{const checked=new Date(x.last_checked||'2026-01-01');return {...x,age:Math.floor((todayDay-Date.UTC(checked.getUTCFullYear(),checked.getUTCMonth(),checked.getUTCDate()))/86400000)}}).sort((a,b)=>b.age-a.age);return `<section class="rf-page patch-page">${hero('DATENQUALITÄT // MONITOR','PATCH-WÄCHTER','Prüfstatus und Alter der übernommenen Katalogdaten sichtbar machen, ohne ungeprüfte Änderungen als Fakten auszugeben.')}${metrics(Object.entries(stats).map(([k,v])=>[v,k]))}<div class="rf-patch-board"><section class="rf-panel"><div class="rf-panel-head"><b>PRÜFQUEUE</b><small>älteste zuerst</small></div>${review.map(x=>`<article class="rf-patch-row"><div><small>${esc(x.status||'offen')}</small><b>${esc(x.name_de)}</b><span>zuletzt geprüft: ${esc(x.last_checked||'—')}</span></div><em>${x.age} Tage</em><button type="button" data-patch-note="${esc(x.id)}">LOKAL NOTIEREN</button></article>`).join('')}</section><aside class="rf-panel"><div class="rf-panel-head"><b>LOKALE PRÜFNOTIZEN</b><small>${arr('jma_patch_notes').length}</small></div>${arr('jma_patch_notes').map(n=>`<p><b>${esc(n.name)}</b><span>${fmt(n.date)}</span></p>`).join('')||'<p>Noch keine lokalen Notizen.</p>'}</aside></div></section>`}
function bindPatchwatch(){navBinds();qsa('[data-patch-note]').forEach(b=>b.onclick=()=>{const x=catalog().find(v=>v.id===b.dataset.patchNote),rows=arr('jma_patch_notes');rows.unshift({id:b.dataset.patchNote,name:x?.name_de||b.dataset.patchNote,date:new Date().toISOString()});write('jma_patch_notes',rows.slice(0,30));toast('Lokale Prüfnotiz gespeichert.');refresh()})}

function renderSecrets(){const rows=AD().seed?.secrets||[],status=read('jma_secret_status','all'),notes=arr('jma_secret_notes'),filtered=status==='all'?rows:rows.filter(x=>x.status===status),statuses=[...new Set(rows.map(x=>x.status))];return `<section class="rf-page secrets-page">${hero('KANINCHENBAU // ANALYSE','GEHEIMNISSE & UNTERSUCHUNGEN','Methodische Hinweise und Prüfstände aus dem bestehenden Projekt – bestätigt und in Prüfung klar getrennt.')}
 <div class="rf-tabs"><button class="${status==='all'?'active':''}" data-secret-status="all">ALLE</button>${statuses.map(s=>`<button class="${status===s?'active':''}" data-secret-status="${esc(s)}">${esc(s.toUpperCase())}</button>`).join('')}</div><div class="rf-secret-grid">${filtered.map(s=>`<article><div class="rf-secret-risk ${s.risk.toLowerCase()}">${esc(s.risk)}</div><small>${esc(s.category)} · ${esc(s.status)}</small><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p><footer><span>${esc(s.evidence)}</span><button type="button" data-secret-note="${esc(s.id)}">＋ NOTIZ</button></footer></article>`).join('')}</div><section class="rf-panel rf-notebook"><div class="rf-panel-head"><b>MEIN NOTIZBUCH</b><small>${notes.length}</small></div>${notes.map(n=>`<div><b>${esc(n.title)}</b><span>${esc(n.text)}</span><button data-secret-delete="${esc(n.id)}">×</button></div>`).join('')||'<p>Noch keine Untersuchungsnotiz gespeichert.</p>'}</section></section>`}
function bindSecrets(){navBinds();qsa('[data-secret-status]').forEach(b=>b.onclick=()=>{write('jma_secret_status',b.dataset.secretStatus);refresh()});qsa('[data-secret-note]').forEach(b=>b.onclick=()=>{const s=(AD().seed?.secrets||[]).find(x=>x.id===b.dataset.secretNote),text=prompt('Deine lokale Notiz zu diesem Thema:','');if(text===null||!text.trim())return;const rows=arr('jma_secret_notes');rows.unshift({id:uid('secret-note'),source:s?.id,title:s?.title||'Notiz',text:text.trim()});write('jma_secret_notes',rows);refresh()});qsa('[data-secret-delete]').forEach(b=>b.onclick=()=>{write('jma_secret_notes',arr('jma_secret_notes').filter(x=>x.id!==b.dataset.secretDelete));refresh()})}

const buildSlots=()=>AD().r9?.buildPlanner?.slots||[];
function buildOptions(slot){const d=AD(),c=catalog();if(/Primär|Sekundär/.test(slot))return [...new Set([...(d.r12?.weapons||[]).map(x=>x.name),...(d.r9?.weaponBlueprints||[]).map(x=>x.name),...c.filter(x=>x.category==='weapons'&&!/Nahkampf|Messer|Schwert/i.test(x.kind||'')).map(x=>x.name_de)])];if(slot==='Nahkampfwaffe')return c.filter(x=>/Nahkampf|Messer|Schwert/i.test(x.kind||'')).map(x=>x.name_de);if(['Helm','Maske','Oberteil','Handschuhe','Hose','Schuhe'].includes(slot))return (d.r9?.armorBlueprints||[]).filter(x=>x.slot===slot).map(x=>x.name);if(slot==='Abweichler')return (d.r9?.deviations||[]).map(x=>x.name);if(slot==='Nahrung')return c.filter(x=>/Fleisch|Food|Nahrung|Verbrauch/i.test(`${x.name_de} ${x.kind}`)).map(x=>x.name_de);return []}

function currentBuild(){return read('jma_build_draft',{id:null,name:'Neuer Build',mode:'Eigener Build',effect:'',notes:'',slots:{},template:null})}
function validateBuild(b){if(!b||typeof b!=='object'||Array.isArray(b)||typeof b.name!=='string'||b.name.trim().length<2||b.name.length>80||!b.slots||typeof b.slots!=='object'||Array.isArray(b.slots))throw new Error('Ungültiger Build: Name und Slots prüfen.');for(const [slot,value]of Object.entries(b.slots))if(!buildSlots().includes(slot)||typeof value!=='string'||value&&!buildOptions(slot).includes(value))throw new Error('Unbekannter Build-Slot oder Ausrüstung: '+slot);if(b.notes!==undefined&&(typeof b.notes!=='string'||b.notes.length>2000)||b.effect!==undefined&&(typeof b.effect!=='string'||b.effect.length>80))throw new Error('Ungültiger Build-Text.');return {id:typeof b.id==='string'?b.id:null,name:b.name.trim(),mode:'Eigener Build',slots:{...b.slots},notes:b.notes||'',effect:b.effect||'',template:null}}
function renderBuilds(){const d=AD(),draft=currentBuild(),saved=arr('jma_saved_builds'),templates=d.seed?.builds||[],slots=buildSlots();const filled=slots.filter(s=>draft.slots?.[s]).length,base=templates.find(x=>x.id===draft.template);return `<section class="rf-page builds-page">${hero('WERKSTATT // LOADOUT','BUILD-PLANER','Waffen, Rüstung, Abweichler, Cradle und Nahrung in einem speicherbaren Loadout zusammenstellen – basierend auf den vorhandenen Planner-Slots.',metrics([[slots.length,'Slots'],[filled,'belegt'],[saved.length,'gespeichert']]))}
 <div class="rf-build-layout"><aside class="rf-panel rf-build-meta"><div class="rf-panel-head"><b>BUILD-PROFIL</b><small>lokaler Entwurf</small></div><label>NAME<input id="buildName" value="${esc(draft.name)}"></label><label>VORLAGE<select id="buildTemplate"><option value="">Eigener Build</option>${templates.map(t=>`<option value="${esc(t.id)}" ${draft.template===t.id?'selected':''}>${esc(t.name)} · ${esc(t.role)}</option>`).join('')}</select></label><label>EFFEKT-FOKUS<select id="buildEffect"><option value="">Kein Fokus</option>${(d.r9?.buildPlanner?.effectFilters||[]).map(x=>`<option ${draft.effect===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>NOTIZ<textarea id="buildNotes">${esc(draft.notes||'')}</textarea></label><div class="rf-action-stack"><button class="cyan-btn compact" id="buildSave" type="button">BUILD SPEICHERN</button><button class="ghost-btn" id="buildClear" type="button">ENTWURF LEEREN</button></div></aside>
 <main class="rf-build-slots">${slots.map((s,i)=>`<article><header><span>${String(i+1).padStart(2,'0')}</span><div><small>SLOT</small><b>${esc(s)}</b></div></header><select data-build-slot="${esc(s)}"><option value="">Nicht belegt</option>${buildOptions(s).map(x=>`<option ${draft.slots?.[s]===x?'selected':''}>${esc(x)}</option>`).join('')}</select><p>${draft.slots?.[s]?esc(draft.slots[s]):'Wähle einen bekannten Eintrag aus dem vorhandenen Datenbestand.'}</p></article>`).join('')}</main>
 <aside class="rf-panel rf-build-saved"><div class="rf-panel-head"><b>GESPEICHERT</b><small>${saved.length}</small></div>${saved.map(b=>`<article><div><small>${esc(b.mode||'Build')} · ${fmt(b.updated)}</small><h3>${esc(b.name)}</h3><p>${Object.values(b.slots||{}).filter(Boolean).length}/${slots.length} Slots</p></div><div><button data-build-load="${esc(b.id)}">LADEN</button><button data-build-delete="${esc(b.id)}">×</button></div></article>`).join('')||empty('Noch kein Build gespeichert')}<label class="file-button">BUILD IMPORTIEREN<input id="buildImport" type="file" accept="application/json"></label><p id="buildMessage" role="status"></p><button class="ghost-btn" id="buildShare" type="button" >BUILD ALS JSON EXPORTIEREN</button></aside></div></section>`}
function bindBuilds(){navBinds();const patch=(k,v)=>{const b=currentBuild();b[k]=v;write('jma_build_draft',b)};on('#buildName','input',e=>patch('name',e.target.value));on('#buildNotes','input',e=>patch('notes',e.target.value));on('#buildEffect','change',e=>patch('effect',e.target.value));qsa('[data-build-slot]').forEach(s=>s.onchange=()=>{const b=currentBuild();b.slots={...b.slots,[s.dataset.buildSlot]:s.value};write('jma_build_draft',b)});qsa('[data-build-tab]').forEach(b=>b.onclick=()=>{write('jma_build_tab',b.dataset.buildTab);refresh()});on('#savedBuildSearch','input',e=>inputRefresh('jma_build_search',e.target.value,'#savedBuildSearch'));on('#buildSave','click',()=>{try{const b=validateBuild(currentBuild());if(!Object.values(b.slots).some(Boolean))throw new Error('Mindestens einen Ausrüstungsslot belegen.');const rows=arr('jma_saved_builds'),obj={...b,id:b.id||uid('build'),updated:new Date().toISOString()},index=rows.findIndex(x=>x.id===obj.id);index<0?rows.unshift(obj):rows.splice(index,1,obj);write('jma_saved_builds',rows);write('jma_build_draft',obj);toast('Build gespeichert.');refresh()}catch(error){qs('#buildMessage').textContent=error.message}});on('#buildTemplate','change',e=>{const b=currentBuild(),t=(AD().seed?.builds||[]).find(x=>x.id===e.target.value);b.template=t?.id||null;b.mode=t?.role||'Eigener Build';if(t){b.name=t.name;b.notes=t.notes||''}write('jma_build_draft',b);refresh()});on('#buildClear','click',()=>{globalThis.JMA_STORE.remove('jma_build_draft');refresh()});qsa('[data-build-load]').forEach(b=>b.onclick=()=>{const saved=arr('jma_saved_builds').find(x=>x.id===b.dataset.buildLoad);if(saved){write('jma_build_draft',saved);write('jma_build_tab','planner');refresh()}});qsa('[data-build-delete]').forEach(b=>b.onclick=()=>{if(!confirm('Build löschen?'))return;write('jma_saved_builds',arr('jma_saved_builds').filter(x=>x.id!==b.dataset.buildDelete));refresh()});qsa('[data-build-layout]').forEach(b=>b.onclick=()=>{const t=AD().seed.builds.find(x=>x.id===b.dataset.buildLayout);write('jma_build_draft',{id:null,name:t.name,mode:'Eigener Build',slots:{},notes:t.notes,effect:'',template:null});write('jma_build_tab','planner');refresh()});on('#buildShare','click',()=>{try{downloadJSON({version:1,build:validateBuild(currentBuild())},'once-human-build.json')}catch(error){qs('#buildMessage').textContent=error.message}});on('#buildImport','change',async e=>{try{const file=e.target.files[0];if(!file||file.size>500000)throw new Error('Build-Datei darf maximal 500 KB groß sein.');const data=JSON.parse(await file.text()),b=validateBuild(data.version===1?data.build:data);b.id=null;write('jma_build_draft',b);refresh();toast('Build als Entwurf importiert.')}catch(error){qs('#buildMessage').textContent=error.message;e.target.value=''}});qsa('[data-build-compare]').forEach(s=>s.onchange=()=>{const values=read('jma_build_compare',(AD().r12.weapons||[]).slice(0,2).map(x=>x.id));values[+s.dataset.buildCompare]=s.value;write('jma_build_compare',values);refresh()})}


const rooms=[['hilfe','Archiv-Hilfe','Fragen zu Katalog, Karte und Werkzeugen'],['funde','Funde & Korrekturen','Wissen gemeinsam prüfen'],['builds','Build-Labor','Loadouts und Ideen diskutieren']];
function renderCommunity(){const room=read('jma_community_room','hilfe'),posts=arr('jma_community_posts').filter(x=>x.room===room);return `<section class="rf-page community-page">${hero('COMMUNITY // LOKALER PROTOTYP','COMMUNITY','Themenräume und Beiträge sind funktional als lokaler Browserzustand umgesetzt; ein Server-Backend ist im aktuellen Projekt noch nicht angeschlossen.')}
 <div class="rf-community-layout"><aside class="rf-room-list">${rooms.map(r=>`<button class="${room===r[0]?'active':''}" data-room="${r[0]}"><b>${r[1]}</b><span>${r[2]}</span><em>${arr('jma_community_posts').filter(x=>x.room===r[0]).length}</em></button>`).join('')}</aside><main class="rf-community-feed"><div class="rf-panel-head"><b>${esc(rooms.find(r=>r[0]===room)?.[1])}</b><small>lokal gespeichert</small></div>${posts.map(p=>`<article><header><b>${esc(p.author)}</b><small>${fmt(p.created)}</small></header><p>${esc(p.text)}</p><footer><button data-post-like="${esc(p.id)}">♡ ${p.likes||0}</button><button data-post-delete="${esc(p.id)}">LÖSCHEN</button></footer></article>`).join('')||empty('Noch keine Beiträge in diesem Raum')}<form id="communityForm"><textarea name="text" required placeholder="Beitrag schreiben …"></textarea><button class="cyan-btn compact" type="submit">BEITRAG LOKAL SPEICHERN</button></form></main></div></section>`}
function bindCommunity(){navBinds();qsa('[data-room]').forEach(b=>b.onclick=()=>{write('jma_community_room',b.dataset.room);refresh()});on('#communityForm','submit',e=>{e.preventDefault();const text=new FormData(e.currentTarget).get('text').trim();if(!text)return;const rows=arr('jma_community_posts'),a=account();rows.unshift({id:uid('post'),room:read('jma_community_room','hilfe'),author:a?.name||'Lokaler Nutzer',text,created:new Date().toISOString(),likes:0});write('jma_community_posts',rows);refresh()});qsa('[data-post-like]').forEach(b=>b.onclick=()=>{const rows=arr('jma_community_posts'),x=rows.find(p=>p.id===b.dataset.postLike);if(x)x.likes=(x.likes||0)+1;write('jma_community_posts',rows);refresh()});qsa('[data-post-delete]').forEach(b=>b.onclick=()=>{write('jma_community_posts',arr('jma_community_posts').filter(x=>x.id!==b.dataset.postDelete));refresh()})}

function renderSubmissions(){const rows=arr('jma_submissions');return `<section class="rf-page submissions-page">${hero('COMMUNITY // PRÜFQUEUE','EINREICHUNGEN','Funde, Korrekturen und Tech-Formeln strukturiert erfassen. Im aktuellen statischen Projekt werden sie lokal gespeichert und klar nicht als veröffentlicht ausgegeben.')}
 <div class="rf-submit-layout"><form class="rf-panel" id="submissionForm"><div class="rf-panel-head"><b>NEUE EINREICHUNG</b><small>lokaler Entwurf</small></div><label>TYP<select name="type"><option>Fund / Ort</option><option>Katalog-Korrektur</option><option>Tech-Formel</option><option>Guide-Hinweis</option></select></label><label>TITEL<input name="title" required></label><label>BEOBACHTUNG<textarea name="body" required></textarea></label><label>BELEG / QUELLE<textarea name="evidence" placeholder="Eigene Beobachtung, Screenshot-Hinweis oder Quellenvermerk"></textarea></label><button class="cyan-btn compact" type="submit">IN LOKALE PRÜFQUEUE</button></form><section class="rf-panel"><div class="rf-panel-head"><b>MEINE EINREICHUNGEN</b><small>${rows.length}</small></div>${rows.map(x=>`<article class="rf-submission-row"><div><small>${esc(x.type)} · ${fmt(x.created)}</small><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><em>Status: ${esc(x.status)}</em></div><button data-sub-delete="${esc(x.id)}">×</button></article>`).join('')||empty('Noch keine lokalen Einreichungen')}</section></div></section>`}
function bindSubmissions(){navBinds();on('#submissionForm','submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),rows=arr('jma_submissions');rows.unshift({id:uid('submission'),type:fd.get('type'),title:String(fd.get('title')).trim(),body:String(fd.get('body')).trim(),evidence:String(fd.get('evidence')||'').trim(),status:'lokal · nicht veröffentlicht',created:new Date().toISOString()});write('jma_submissions',rows);toast('Einreichung lokal gespeichert.');refresh()});qsa('[data-sub-delete]').forEach(b=>b.onclick=()=>{write('jma_submissions',arr('jma_submissions').filter(x=>x.id!==b.dataset.subDelete));refresh()})}

const profileColors={cyan:'#45e3f1',red:'#ff3d5e',gold:'#edc775',violet:'#b89bf8'};
function appearance(source){const p=source||(Object.keys(account()?.appearance||{}).length?account().appearance:read('jma_profile_appearance',{})),assets=globalThis.PROFILE_ASSETS;return {avatar:assets.avatars.some(x=>x.id===p.avatar)||/^upload-[a-f0-9-]{36}$/.test(p.avatar||'')?p.avatar:'none',frame:assets.frames.some(x=>x.id===p.frame)?p.frame:'none',banner:assets.banners.some(x=>x.id===p.banner)?p.banner:'kartenwelt',color:Object.hasOwn(profileColors,p.color)?p.color:'cyan',ring:['none','cyan','red','gold'].includes(p.ring)?p.ring:'none',wreath:['none','orbit','laurel'].includes(p.wreath)?p.wreath:'none',bio:String(p.bio||'').slice(0,280),faction:String(p.faction||'').slice(0,40),region:String(p.region||'').slice(0,40),language:String(p.language||'Deutsch').slice(0,30),highlight:String(p.highlight||'').slice(0,120),trophy:String(p.trophy||'').slice(0,40),widgets:(Array.isArray(p.widgets)?p.widgets:['gallery','builds','routes','activities','showcase']).filter(x=>['gallery','builds','routes','activities','showcase'].includes(x))}}
function profileStats(){const known=new Set(catalog().map(x=>x.id));return {found:[...set('jma_found')].filter(x=>known.has(x)).length,favorites:[...set('jma_favorites')].filter(x=>known.has(x)).length,hunt:[...set('jma_hunt')].filter(x=>known.has(x)).length,builds:arr('jma_saved_builds').length,routes:arr('jma_routes').length,plans:arr('jma_plans').length,markers:mapCustom().length,submissions:arr('jma_submissions').length,total:catalog().length}}
const achievementDefs=[['first-find','Erster Fund','found',1,'◇'],['collector','Sammler','found',10,'▦'],['first-build','Erster Build','builds',1,'⚒'],['builder','Build-Werkstatt','builds',5,'⬡'],['first-route','Erste Route','routes',1,'◎'],['pathfinder','Pfadfinder','routes',5,'↝'],['planner','Einsatzbereit','plans',1,'◷'],['contributor','Archivbeitrag','submissions',1,'✧']];
function achievements(){const stats=profileStats(),earned=read('jma_achievements',{});let changed=false;for(const [id,,key,n]of achievementDefs)if(stats[key]>=n&&!earned[id]){earned[id]=new Date().toISOString();changed=true}if(changed)write('jma_achievements',earned);return achievementDefs.map(([id,name,key,n,icon])=>({id,name,key,n,icon,progress:Math.min(n,stats[key]),earned:earned[id]||null}))}
function avatar(p=appearance(),tiny=false){const a=globalThis.PROFILE_ASSETS.avatars.find(x=>x.id===p.avatar),frame=globalThis.PROFILE_ASSETS.frames.find(x=>x.id===p.frame),upload=p.avatar?.startsWith('upload-');return `<span class="profile-avatar ${tiny?'tiny':''} ring-${esc(p.ring)} wreath-${esc(p.wreath)}" style="--accent:${profileColors[p.color]}">${upload?`<img class="avatar-image" data-media-id="${esc(p.avatar)}" alt="Eigener Avatar">`:a?`<img class="avatar-image" src="${esc(a.src)}" alt="${esc(a.name)}">`:`<b>${esc((account()?.name||'?')[0])}</b>`}${frame?`<img class="avatar-frame" src="${esc(frame.src)}" alt="${esc(frame.name)}">`:''}${p.wreath==='laurel'?'<svg class="avatar-laurel" viewBox="0 0 100 100" aria-hidden="true"><path d="M35 92C1 75 3 30 24 12M65 92C99 75 97 30 76 12" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 29l-8-12 14 5M9 43L0 31l14 6M10 58L0 47l14 5M16 74L3 65l17 2M86 29l8-12-14 5M91 43l9-12-14 6M90 58l10-11-14 5M84 74l13-9-17 2" fill="currentColor"/></svg>':''}</span>`}
globalThis.JMA_PROFILE={avatar,appearance,stats:profileStats};
globalThis.JMA_PROFILE_SETTINGS={render:renderProfileSettingsEditor,bind:()=>{bindProfileAppearance();bindProfileEditorTabs();on('#profileEditClose','click',()=>{location.hash='#/settings'})}};

function renderProfileEditorBody(a,initial,email,embedded=false){
  const p=appearance(),banner=globalThis.PROFILE_ASSETS.banners.find(x=>x.id===p.banner),bannerSrc=banner?.src||'./assets/reference/feature-map.webp';
  const tabs=[
    ['general','ALLGEMEIN'],['avatar','PROFILBILD'],['banner','BANNER'],['colors','FARBEN'],['about','ÜBER MICH'],
    ['highlights','HIGHLIGHTS'],['widgets','WIDGETS'],['frames','RAHMEN'],['decorations','RINGE & KRÄNZE'],['trophies','TROPHÄEN']
  ];
  const livePreview=embedded?`<div class="settings-profile-live" data-profile-live style="--profile-live-accent:${profileColors[p.color]};--profile-live-banner:url('${esc(bannerSrc)}')">
    <div class="settings-profile-live-art">
      <div class="settings-profile-live-avatar" data-profile-live-avatar>${avatar(p)}</div>
      <div class="settings-profile-live-copy">
        <small data-profile-live-mode>ALLGEMEIN // LIVE-VORSCHAU</small>
        <h2 data-profile-live-name>${esc(a?.name||email||'Archiv-Nutzer')}</h2>
        <p data-profile-live-bio>${esc(p.bio||'Dein persönliches Archivprofil.')}</p>
        <span><i></i> ONLINE · VORSCHAU</span>
      </div>
      <div class="settings-profile-live-chip" data-profile-live-chip>PROFILIDENTITÄT</div>
    </div>
  </div>`:'';
  const tabStrip=embedded?`<nav class="settings-profile-tabs" aria-label="Profilbereiche">
    ${tabs.map(([id,label],index)=>`<button type="button" class="${index===0?'active':''}" data-profile-edit-tab="${id}">${label}</button>`).join('')}
  </nav>`:`<nav class="profile-ref-drawer-nav" aria-label="Profil bearbeiten">
    ${tabs.slice(0,7).map(([id,label],index)=>`<button type="button" class="${index===0?'active':''}" data-profile-edit-tab="${id}">${label}</button>`).join('')}
  </nav>`;
  return `<div class="profile-ref-drawer-body ${embedded?'settings-profile-flat':''}">
    ${embedded?'':tabStrip}
    <div class="profile-ref-drawer-content ${embedded?'settings-profile-work':''}">
      ${embedded?tabStrip:''}
      ${livePreview}
      <div class="settings-profile-panel-stage">
        <section class="active" data-profile-edit-panel="general">
          <small>ALLGEMEIN</small><h3>PROFILIDENTITÄT</h3>
          <div class="profile-ref-editor-avatar"><span>${esc(initial)}</span></div>
          <p>${esc(email)}</p>
          <form id="profileNameForm"><label><span>ANZEIGENAME</span><input name="name" value="${esc(a?.name||'')}" required minlength="2" autocomplete="nickname"></label><button type="submit">ÄNDERUNGEN SPEICHERN</button></form>
        </section>
        <section data-profile-edit-panel="avatar"></section>
        <section data-profile-edit-panel="banner"></section>
        <section data-profile-edit-panel="colors"></section>
        <section data-profile-edit-panel="about"></section>
        <section data-profile-edit-panel="highlights"></section>
        <section data-profile-edit-panel="widgets"></section>
        ${embedded?'<section data-profile-edit-panel="frames"></section><section data-profile-edit-panel="decorations"></section><section data-profile-edit-panel="trophies"></section>':''}
      </div>
    </div>
  </div>`;
}
function renderProfileSettingsEditor(){
  const a=account(),name=a?.name||a?.email||'Archiv-Nutzer',email=a?.email||'—',initial=String(name||'?').trim().charAt(0).toUpperCase()||'?';
  return `<section class="settings-profile-editor" id="profileEditDrawer" aria-labelledby="settingsProfileTitle">
    <header class="settings-profile-editor-head">
      <div><small>PROFIL // EDITOR</small><h1 id="settingsProfileTitle">PROFIL ANPASSEN</h1><p>Identität, Darstellung und Profilmodule an einem zentralen Ort.</p></div>
      <button type="button" id="profileEditClose" aria-label="Zur Darstellung zurück">← DARSTELLUNG</button>
    </header>
    ${renderProfileEditorBody(a,initial,email,true)}
  </section>`;
}

function renderProfile(){
  const a=account(),fav=set('jma_favorites'),found=set('jma_found'),hunt=set('jma_hunt'),builds=arr('jma_saved_builds'),routeRows=arr('jma_routes'),plans=arr('jma_plans'),markers=arr('jma_custom_markers'),submissions=arr('jma_submissions'),exchangePosts=arr('jma_exchange_posts');
  const displayName=a?.name||a?.email||'Archiv-Nutzer',email=a?.email||'—',initial=String(displayName||'?').trim().charAt(0).toUpperCase()||'?';
  const catalogTotal=catalog().length,foundRate=catalogTotal?Math.max(0,Math.min(100,Math.round(found.size/catalogTotal*100))):0,slotsTotal=buildSlots().length;
  const p=appearance(),profileView=read('jma_profile_view','overview')==='collection'?'collection':'overview';
  const latestBuild=builds.find(x=>x.id===p.highlight)||builds[0]||null,latestBuildSlots=latestBuild?Object.values(latestBuild.slots||{}).filter(Boolean).length:0;
  const activities=[
    ...submissions.map(x=>({kind:'EINREICHUNG',title:x.title||x.type||'Einreichung',meta:x.status||x.type||'',created:x.created||''})),
    ...exchangePosts.map(x=>({kind:'WERKSTATT',title:x.title||x.type||'Community-Beitrag',meta:x.type||'',created:x.created||''}))
  ].sort((x,y)=>(Date.parse(y.created)||0)-(Date.parse(x.created)||0)).slice(0,4);
  const gallery=arr('jma_gallery'),archivePreview=[['./assets/reference/feature-map.webp','Kartenarchiv'],['./assets/reference/feature-community.webp','Archivwelt'],['./assets/reference/news-hero.webp','Gefahrenzone'],['./assets/reference/showcase-items.webp','Anomalien'],['./assets/reference/news-mini-1.webp','Einsatzgebiet']];
  return `<section class="rf-page profile-page profile-ref-page">
    <section class="profile-ref-banner" style="${p.banner!=='kartenwelt'?`background-image:url('${globalThis.PROFILE_ASSETS.banners.find(x=>x.id===p.banner).src}')`:p.color!=='cyan'?`border-color:${profileColors[p.color]}`:''}">
      <div class="profile-ref-banner-shade"></div>
      <div class="profile-ref-avatar" aria-label="Profilinitiale">${p.avatar==='none'&&p.frame==='none'&&p.ring==='none'&&p.wreath==='none'?`<span>${esc(initial)}</span>`:avatar(p)}<i></i></div>
      <div class="profile-ref-identity">
        <div class="profile-ref-kicker">ONCE HUMAN ARCHIV // PROFIL</div>
        <h1 style="${p.color==='cyan'?'':'color:'+profileColors[p.color]}">${esc(displayName)}</h1>
        <div class="profile-ref-account-line"><span class="profile-ref-online-dot"></span><b>${a?'ACCOUNT VERBUNDEN':'KEINE SITZUNG'}</b><span>${esc(email)}</span></div>
        <p>${esc(p.bio||'Sammeln. Planen. Bauen. Archivieren. Dein persönlicher Arbeitsbereich für die vorhandenen Werkzeuge und lokalen Archivdaten.')}</p>
        <div class="profile-ref-progress">
          <div><span>SAMMLUNGSFORTSCHRITT</span><b>${found.size} / ${catalogTotal}</b></div>
          <i><em style="width:${foundRate}%"></em></i>
        </div>
      </div>
      <aside class="profile-ref-banner-side">
        <button class="profile-ref-edit-button" type="button" data-profile-edit-open>✎ PROFIL ANPASSEN</button>
        <div class="profile-ref-banner-note"><small>ARCHIVSTATUS</small><b>${foundRate}% ERFASST</b><span>Berechnet aus deinen tatsächlich als gefunden markierten Katalogeinträgen.</span></div>
      </aside>
    </section>

    <section class="profile-ref-stats" id="profileStatsSection">
      <article><i>▣</i><div><b>${found.size}</b><span>GEFUNDENE ITEMS</span></div></article>
      <article><i>⌖</i><div><b>${routeRows.length}</b><span>GESPEICHERTE ROUTEN</span></div></article>
      <article><i>⚒</i><div><b>${builds.length}</b><span>GESPEICHERTE BUILDS</span></div></article>
      <article><i>♥</i><div><b>${fav.size}</b><span>FAVORITEN</span></div></article>
    </section>

    <nav class="profile-ref-tabs" aria-label="Profilbereiche">
      <button class="${profileView==='overview'?'active':''}" type="button" data-profile-view="overview" ${profileView==='overview'?'aria-current="page"':''}><i>⌂</i><span>ÜBERSICHT</span></button>
      <button class="${profileView==='collection'?'active':''}" type="button" data-profile-view="collection" ${profileView==='collection'?'aria-current="page"':''}><i>◇</i><span>SAMMLUNG</span></button>
      <button type="button" data-rf-go="builds"><i>⚒</i><span>BUILDS</span></button>
      <button type="button" data-rf-go="routes"><i>⌖</i><span>ROUTEN</span></button>
      <button type="button" data-profile-scroll="profileStatsSection"><i>▥</i><span>STATISTIKEN</span></button>
      <button type="button" data-profile-scroll="profileGallerySection"><i>▧</i><span>GALERIE</span></button>
    </nav>

    <div data-profile-view-panel="overview" ${profileView==='overview'?'':'hidden'}>
    <div class="profile-ref-grid">
      <div class="profile-ref-col profile-ref-col-left">
        <section class="profile-ref-panel profile-ref-highlight">
          <header><div><span></span><h2>HIGHLIGHTS</h2></div><small>${latestBuild?'GESPEICHERTER BUILD':'PROFILMODUL'}</small></header>
          <div class="profile-ref-highlight-media">
            <img src="./assets/reference/feature-builds.webp" alt="" loading="lazy">
            <div class="profile-ref-highlight-overlay">
              <small>${latestBuild?'PERSÖNLICHES HIGHLIGHT':'NOCH KEIN HIGHLIGHT'}</small>
              <h3>${latestBuild?esc(latestBuild.name||'Gespeicherter Build'):'NOCH KEIN HIGHLIGHT'}</h3>
              <p>${latestBuild?`${latestBuildSlots} von ${slotsTotal} Build-Slots belegt.`:'Sobald ein echter persönlicher Highlight-Flow existiert, kann dieser Bereich damit verbunden werden.'}</p>
              ${latestBuild?'<button type="button" data-rf-go="builds">BUILD ÖFFNEN →</button>':'<button type="button" disabled aria-disabled="true">BEARBEITEN // BALD VERFÜGBAR</button>'}
            </div>
          </div>
        </section>

        <section class="profile-ref-panel profile-ref-activity" ${p.widgets.includes('activities')?'':'hidden'}>
          <header><div><span></span><h2>LETZTE AKTIVITÄTEN</h2></div><small>LOKAL</small></header>
          <div class="profile-ref-activity-list">${activities.length?activities.map(x=>`<article><i>${x.kind==='EINREICHUNG'?'⇧':'◇'}</i><div><small>${esc(x.kind)}${x.created?` · ${esc(fmt(x.created))}`:''}</small><h3>${esc(x.title)}</h3><p>${esc(x.meta||'Lokaler persönlicher Eintrag')}</p></div></article>`).join(''):`<div class="profile-ref-empty"><b>NOCH KEINE AKTIVITÄTEN</b><span>Lokale Einreichungen oder Werkstatt-Beiträge erscheinen hier, sobald sie vorhanden sind.</span></div>`}</div>
        </section>
      </div>

      <main class="profile-ref-col profile-ref-col-center">
        <section class="profile-ref-panel profile-ref-gallery" ${p.widgets.includes('gallery')?'':'hidden'} id="profileGallerySection">
          <header><div><span></span><h2>GALERIE</h2></div><small>${gallery.length?`${gallery.length}/6 EIGENE BILDER`:'ARCHIVVORSCHAU // KEINE PERSÖNLICHEN UPLOADS'}</small></header>
          <div class="profile-ref-gallery-grid">${gallery.length?gallery.map((image,i)=>`<figure class="${i===0?'featured':''}"><img data-media-id="${esc(image.id)}" alt="${esc(image.name)}" loading="lazy"><figcaption>${esc(image.name)} <button data-gallery-remove="${esc(image.id)}" aria-label="Galeriebild löschen">×</button></figcaption></figure>`).join(''):archivePreview.map(([src,label],i)=>`<figure class="${i===0?'featured':''}"><img src="${src}" alt="" loading="lazy"><figcaption>${esc(label)}</figcaption></figure>`).join('')}</div>
          <div class="profile-ref-gallery-note"><span>${gallery.length?'Deine Uploads bleiben lokal in diesem Browser.':'Bis zum ersten eigenen Upload: bestehende Archivvorschau.'}</span><label class="file-button">BILD HOCHLADEN<input id="galleryUpload" type="file" accept="image/png,image/jpeg,image/webp" ${gallery.length>=6?'disabled':''}></label></div>
        </section>

        <section class="profile-ref-panel profile-ref-builds" ${p.widgets.includes('builds')?'':'hidden'}>
          <header><div><span></span><h2>GESPEICHERTE BUILDS</h2></div><button type="button" data-rf-go="builds">ALLE BUILDS →</button></header>
          <div class="profile-ref-build-list">${builds.length?builds.slice(0,4).map(b=>{const filled=Object.values(b.slots||{}).filter(Boolean).length;return `<article><i>⚒</i><small>${esc(b.mode||'BUILD')}</small><h3>${esc(b.name||'Gespeicherter Build')}</h3><p>${filled}/${slotsTotal} Slots belegt</p></article>`}).join(''):`<div class="profile-ref-empty wide"><b>NOCH KEINE BUILDS GESPEICHERT</b><span>Gespeicherte Builds aus dem vorhandenen Build-Planer erscheinen hier.</span><button type="button" data-rf-go="builds">BUILD-PLANER ÖFFNEN →</button></div>`}</div>
        </section>

        <section class="profile-ref-panel profile-ref-routes" ${p.widgets.includes('routes')?'':'hidden'}>
          <header><div><span></span><h2>GESPEICHERTE ROUTEN</h2></div><button type="button" data-rf-go="routes">ALLE ROUTEN →</button></header>
          <div class="profile-ref-route-list">${routeRows.length?routeRows.slice(0,3).map(x=>`<article><i>⌖</i><div><small>${x.created?esc(fmt(x.created)):'LOKALE ROUTE'}</small><h3>${esc(x.name||'Gespeicherte Route')}</h3><p>${Array.isArray(x.markers)?x.markers.length:0} Stationen</p></div></article>`).join(''):`<div class="profile-ref-empty wide"><b>NOCH KEINE ROUTEN GESPEICHERT</b><span>Persönliche Farmrouten erscheinen hier, sobald sie angelegt wurden.</span><button type="button" data-rf-go="routes">FARMROUTEN ÖFFNEN →</button></div>`}</div>
        </section>
      </main>

      <aside class="profile-ref-col profile-ref-col-right">
        <section class="profile-ref-panel profile-ref-info">
          <header><div><span></span><h2>PERSÖNLICHE INFORMATIONEN</h2></div><button type="button" data-profile-edit-open>✎</button></header>
          <dl>
            <div><dt>ANZEIGENAME</dt><dd>${esc(displayName)}</dd></div>
            <div><dt>E-MAIL</dt><dd>${esc(email)}</dd></div>
            <div><dt>ACCOUNTSTATUS</dt><dd class="ok">${a?'VERBUNDEN':'KEINE SITZUNG'}</dd></div>
            <div><dt>AUTHENTIFIZIERUNG</dt><dd>Supabase Auth</dd></div>
            <div><dt>SAMMLUNG</dt><dd>${new Set([...fav,...found]).size} Einträge</dd></div>
            <div><dt>EINREICHUNGEN</dt><dd>${submissions.length} lokal</dd></div>
          </dl>
        </section>

        <section class="profile-ref-panel profile-ref-data">
          <header><div><span></span><h2>DATEN & SICHERHEIT</h2></div><small>LOKAL + SUPABASE</small></header>
          <p>Werkzeugdaten werden derzeit teilweise lokal im Browser gespeichert. Passwort- und Sitzungsdaten gehören nicht zum Export.</p>
          <div class="profile-ref-data-actions"><button type="button" id="profileExport">DATEN EXPORTIEREN</button><button type="button" id="profileClear" class="danger">WERKZEUGDATEN LÖSCHEN</button></div>
          <small class="profile-ref-data-note">Lokales Löschen beendet deine bestehende Kontositzung nicht.</small>
        </section>

        <section class="profile-ref-panel profile-ref-prepared">
          <header><div><span></span><h2>ERFOLGSSYSTEM</h2></div><small>IN VORBEREITUNG</small></header>
          <div class="profile-ref-prepared-body"><i>⬡</i><div><b>${achievements().filter(x=>x.earned).length} ARCHIV-MEILENSTEINE</b><span>${achievements().filter(x=>x.earned).map(x=>esc(x.name)).join(' · ')||'Echte Werkzeugaktionen schalten Trophäen frei.'}</span></div></div>
        </section>

        <section class="profile-ref-panel profile-ref-prepared">
          <header><div><span></span><h2>WAFFEN-SHOWCASE</h2></div><small>IN VORBEREITUNG</small></header>
          <div class="profile-ref-slot-row"><span>+</span><span>+</span><span>+</span><span>+</span></div>
          <p class="profile-ref-prepared-copy">Wird erst mit echten persönlichen Waffenfavoriten befüllt.</p>
        </section>
      </aside>
    </div>
    </div>

    <div data-profile-view-panel="collection" ${profileView==='collection'?'':'hidden'}>
      ${renderCollectionBody()}
    </div>

    <div class="profile-ref-drawer-backdrop" id="profileEditBackdrop" hidden></div>
    <aside class="profile-ref-drawer" id="profileEditDrawer" hidden aria-labelledby="profileEditTitle">
      <header><div><small>PROFIL // EDITOR</small><h2 id="profileEditTitle">PROFIL ANPASSEN</h2></div><button type="button" id="profileEditClose" aria-label="Profil-Anpassen schließen">×</button></header>
      ${renderProfileEditorBody(a,initial,email)}
    </aside>
  </section>`;
}
function bindProfileHoloTabs(){
  const cards=qsa('.profile-ref-tabs button');
  cards.forEach(card=>{
    let frame=0;
    const reset=()=>{
      cancelAnimationFrame(frame);
      card.style.setProperty('--px','50%');
      card.style.setProperty('--py','50%');
      card.style.setProperty('--rx','0deg');
      card.style.setProperty('--ry','0deg');
    };
    card.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch')return;
      const rect=card.getBoundingClientRect();
      const x=Math.max(0,Math.min(rect.width,event.clientX-rect.left));
      const y=Math.max(0,Math.min(rect.height,event.clientY-rect.top));
      const px=(x/rect.width)*100;
      const py=(y/rect.height)*100;
      const ry=((x/rect.width)-.5)*9;
      const rx=((y/rect.height)-.5)*-7;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        card.style.setProperty('--px',px.toFixed(2)+'%');
        card.style.setProperty('--py',py.toFixed(2)+'%');
        card.style.setProperty('--rx',rx.toFixed(2)+'deg');
        card.style.setProperty('--ry',ry.toFixed(2)+'deg');
      });
    });
    card.addEventListener('pointerleave',reset);
    card.addEventListener('pointercancel',reset);
  });
}
function updateProfileSettingsLivePreview(tab){
  const live=qs('[data-profile-live]');
  if(!live||!profileDraft)return;
  const activeTab=tab||qs('[data-profile-edit-tab].active')?.dataset.profileEditTab||'general';
  const labels={
    general:['ALLGEMEIN // LIVE-VORSCHAU','PROFILIDENTITÄT'],
    avatar:['PROFILBILD // LIVE-VORSCHAU','AVATAR + RAHMEN'],
    banner:['BANNER // LIVE-VORSCHAU','BANNER + AVATAR'],
    colors:['FARBEN // LIVE-VORSCHAU','AKZENTWIRKUNG'],
    about:['ÜBER MICH // LIVE-VORSCHAU','PROFILTEXT'],
    highlights:['HIGHLIGHTS // LIVE-VORSCHAU','BUILD-HIGHLIGHT'],
    widgets:['WIDGETS // LIVE-VORSCHAU','PROFILMODULE'],
    frames:['RAHMEN // LIVE-VORSCHAU','AVATAR + RAHMEN'],
    decorations:['RINGE & KRÄNZE // LIVE-VORSCHAU','PROFILDEKORATION'],
    trophies:['TROPHÄEN // LIVE-VORSCHAU','ARCHIV-TROPHÄE']
  };
  const banner=globalThis.PROFILE_ASSETS.banners.find(x=>x.id===profileDraft.banner);
  const bannerSrc=banner?.src||'./assets/reference/feature-map.webp';
  const name=qs('#profileNameForm input[name="name"]')?.value.trim()||account()?.name||account()?.email||'Archiv-Nutzer';
  live.dataset.mode=activeTab;
  live.style.setProperty('--profile-live-accent',profileColors[profileDraft.color]||profileColors.cyan);
  live.style.setProperty('--profile-live-banner',`url("${bannerSrc}")`);
  const avatarHost=qs('[data-profile-live-avatar]',live);
  if(avatarHost) avatarHost.innerHTML=avatar(profileDraft);
  const mode=qs('[data-profile-live-mode]',live),chip=qs('[data-profile-live-chip]',live),nameEl=qs('[data-profile-live-name]',live),bio=qs('[data-profile-live-bio]',live);
  if(mode) mode.textContent=(labels[activeTab]||labels.general)[0];
  if(chip) chip.textContent=(labels[activeTab]||labels.general)[1];
  if(nameEl) nameEl.textContent=name;
  if(bio) bio.textContent=profileDraft.bio||'Dein persönliches Archivprofil.';
  globalThis.JMA_MEDIA.hydrate(live);
}
function bindProfileEditorTabs(){
  const editTabs=qsa('[data-profile-edit-tab]'),editPanels=qsa('[data-profile-edit-panel]');
  editTabs.forEach(b=>b.onclick=()=>{
    editTabs.forEach(x=>x.classList.toggle('active',x===b));
    editPanels.forEach(x=>{
      const active=x.dataset.profileEditPanel===b.dataset.profileEditTab;
      x.classList.toggle('active',active);
      if(active){x.classList.remove('panel-enter');void x.offsetWidth;x.classList.add('panel-enter')}
    });
    updateProfileSettingsLivePreview(b.dataset.profileEditTab);
  });
  updateProfileSettingsLivePreview(editTabs.find(x=>x.classList.contains('active'))?.dataset.profileEditTab||'general');
}
function bindProfile(){
  navBinds();globalThis.JMA_MEDIA.hydrate();bindProfileAppearance();bindProfileHoloTabs();
  const drawer=qs('#profileEditDrawer'),backdrop=qs('#profileEditBackdrop');
  const setDrawer=open=>{if(!drawer||!backdrop)return;drawer.hidden=!open;backdrop.hidden=!open;drawer.setAttribute('aria-hidden',open?'false':'true')};
  qsa('[data-profile-edit-open]').forEach(b=>b.onclick=()=>{location.hash='#/settings/profile'});
  on('#profileEditClose','click',()=>setDrawer(false));
  on('#profileEditBackdrop','click',()=>setDrawer(false));
  bindProfileEditorTabs();
  const setProfileView=view=>{view=view==='collection'?'collection':'overview';write('jma_profile_view',view);qsa('[data-profile-view]').forEach(x=>{const active=x.dataset.profileView===view;x.classList.toggle('active',active);active?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current')});qsa('[data-profile-view-panel]').forEach(x=>x.hidden=x.dataset.profileViewPanel!==view)};
  qsa('[data-profile-view]').forEach(b=>b.onclick=()=>setProfileView(b.dataset.profileView));
  qsa('[data-profile-scroll]').forEach(b=>b.onclick=()=>{setProfileView('overview');requestAnimationFrame(()=>qs('#'+b.dataset.profileScroll)?.scrollIntoView({behavior:'smooth',block:'start'}))});
  bindCollectionControls();
  on('#galleryUpload','change',async e=>{try{const file=e.target.files[0],rows=arr('jma_gallery');if(rows.length>=6)throw new Error('Maximal sechs Galerie-Bilder.');const id=await globalThis.JMA_MEDIA.save(file);rows.push({id,name:file.name,created:new Date().toISOString()});write('jma_gallery',rows);refresh()}catch(error){toast(error.message)}});qsa('[data-gallery-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Galeriebild löschen?'))return;await globalThis.JMA_MEDIA.remove(b.dataset.galleryRemove);write('jma_gallery',arr('jma_gallery').filter(x=>x.id!==b.dataset.galleryRemove));refresh()});
  on('#profileExport','click',()=>{const out={exported:new Date().toISOString()};['jma_favorites','jma_hunt','jma_hunt_meta','jma_saved_builds','jma_routes','jma_plans','jma_submissions','jma_community_posts','jma_found','jma_custom_markers','jma_exchange_posts'].forEach(k=>{if(read(k)!==null)out[k]=read(k)});const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='once-human-archiv-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)});
  on('#profileClear','click',()=>{if(!confirm('Lokale Werkzeugdaten löschen? Konto/Anmeldung bleiben erhalten.'))return;['jma_favorites','jma_hunt','jma_hunt_meta','jma_saved_builds','jma_build_draft','jma_routes','jma_route_draft','jma_plans','jma_submissions','jma_community_posts','jma_found','jma_custom_markers','jma_exchange_posts'].forEach(k=>globalThis.JMA_STORE.remove(k));toast('Werkzeugdaten gelöscht.');refresh()});
}


function collectionState(){const fav=set('jma_favorites'),found=set('jma_found'),mode=read('jma_collection_mode','all');let rows=catalog().filter(x=>fav.has(x.id)||found.has(x.id));if(mode==='fav')rows=rows.filter(x=>fav.has(x.id));if(mode==='found')rows=rows.filter(x=>found.has(x.id));return {fav,found,mode,rows}}
function renderCollectionBody(state=collectionState()){const {fav,found,mode,rows}=state;return `<div class="rf-tabs"><button class="${mode==='all'?'active':''}" data-collection-mode="all">ALLE</button><button class="${mode==='fav'?'active':''}" data-collection-mode="fav">FAVORITEN</button><button class="${mode==='found'?'active':''}" data-collection-mode="found">GEFUNDEN</button></div><div class="rf-collection-grid">${rows.map(x=>`<article><small>${esc(x.kind||x.category)}</small><h3>${esc(x.name_de)}</h3><p>${esc(x.description||'')}</p><div class="rf-chips">${fav.has(x.id)?'<span>★ Favorit</span>':''}${found.has(x.id)?'<span>✓ Gefunden</span>':''}</div><div class="actions"><button data-found-toggle="${esc(x.id)}">${found.has(x.id)?'GEFUNDEN AUFHEBEN':'ALS GEFUNDEN'}</button><button data-fav-toggle="${esc(x.id)}">${fav.has(x.id)?'FAVORIT ENTFERNEN':'FAVORIT'}</button></div></article>`).join('')||empty('Sammlung ist leer')}<div class="rf-inline-cta">${btnLink('database','DATENBANK DURCHSUCHEN','cyan-btn compact')}</div></div>`}
function bindCollectionControls(){qsa('[data-collection-mode]').forEach(b=>b.onclick=()=>{write('jma_collection_mode',b.dataset.collectionMode);refresh()});qsa('[data-found-toggle]').forEach(b=>b.onclick=()=>{const s=set('jma_found'),id=b.dataset.foundToggle;s.has(id)?s.delete(id):s.add(id);putSet('jma_found',s);refresh()});qsa('[data-fav-toggle]').forEach(b=>b.onclick=()=>{const s=set('jma_favorites'),id=b.dataset.favToggle;s.has(id)?s.delete(id):s.add(id);putSet('jma_favorites',s);refresh()})}

function filterSearch(rows,q,fn=x=>JSON.stringify(x)){q=(q||'').trim().toLowerCase();return q?rows.filter(x=>fn(x).toLowerCase().includes(q)):rows}
function renderWeaponBlueprints(){const rows=AD().r9?.weaponBlueprints||[],q=read('jma_wb_q',''),fam=read('jma_wb_family','all'),families=[...new Set(rows.map(x=>x.family))],view=filterSearch(rows.filter(x=>fam==='all'||x.family===fam),q,x=>`${x.name} ${x.family} ${x.rarity}`);return `<section class="rf-page arsenal-page">${hero('DATENBANK // ARSENAL','WAFFEN-BLAUPAUSEN','Blaupausen nach Familie, Seltenheit und offensiven Referenzwerten durchsuchen.',metrics([[rows.length,'Blaupausen'],[families.length,'Familien']]))}<div class="rf-special-toolbar"><input id="wbSearch" value="${esc(q)}" placeholder="Waffe suchen …"><select id="wbFamily"><option value="all">Alle Familien</option>${families.map(x=>`<option ${x===fam?'selected':''}>${esc(x)}</option>`).join('')}</select>${btnLink('compare-weapons','⇄ VERGLEICH ÖFFNEN')}</div><div class="rf-arsenal-grid">${view.map(x=>`<article><div class="rf-weapon-mark">⌁</div><small>${esc(x.rarity)} · ${esc(x.family)}</small><h2>${esc(x.name)}</h2><div class="rf-stat-bars">${[['Krit-Rate',x.critRate],['Krit-Schaden',x.critDmg],['Schwachstelle',x.weakspot]].map(([k,v])=>`<div><span>${k}</span><i><em style="width:${Math.min(100,v)}%"></em></i><b>${v}%</b></div>`).join('')}</div></article>`).join('')}</div></section>`}
function bindWeaponBlueprints(){navBinds();on('#wbSearch','input',e=>inputRefresh('jma_wb_q',e.target.value,'#wbSearch'));on('#wbFamily','change',e=>{write('jma_wb_family',e.target.value);refresh()})}

function renderArmorBlueprints(){const rows=AD().r9?.armorBlueprints||[],slot=read('jma_ab_slot','all'),slots=[...new Set(rows.map(x=>x.slot))],view=rows.filter(x=>slot==='all'||x.slot===slot);return `<section class="rf-page armor-page">${hero('DATENBANK // SCHUTZ','RÜSTUNGS-BLAUPAUSEN','Rüstungsteile nach Slot, Familie, Tier und hinterlegten Basiswerten ansehen.')}
 <div class="rf-tabs"><button class="${slot==='all'?'active':''}" data-armor-slot="all">ALLE</button>${slots.map(s=>`<button class="${slot===s?'active':''}" data-armor-slot="${esc(s)}">${esc(s.toUpperCase())}</button>`).join('')}</div><div class="rf-armor-grid">${view.map(x=>`<article><div class="rf-armor-icon">⬡</div><small>${esc(x.slot)} · ${esc(x.family)} · Tier ${x.tier}</small><h2>${esc(x.name)}</h2><div class="rf-kv"><span><small>LP</small><b>${x.hp}</b></span><span><small>PSI</small><b>${x.psi}</b></span><span><small>VERSCHMUTZUNG</small><b>${x.pollution}</b></span><span><small>HALTBARKEIT</small><b>${x.durability}</b></span></div></article>`).join('')}</div>${btnLink('compare-armors','RÜSTUNG VERGLEICHEN','cyan-btn compact')}</section>`}
function bindArmorBlueprints(){navBinds();qsa('[data-armor-slot]').forEach(b=>b.onclick=()=>{write('jma_ab_slot',b.dataset.armorSlot);refresh()})}

function renderArmorMaterials(){const rows=AD().r9?.armorMaterials?.samples||[],q=read('jma_am_q',''),view=filterSearch(rows,q,x=>`${x.name} ${x.source} ${x.summary}`);return `<section class="rf-page materials-page">${hero('DATENBANK // MATERIALKUNDE','RÜSTUNGSMATERIALIEN',`${AD().r9?.armorMaterials?.count||rows.length} Materialien im Referenzbestand; hier die kuratierte Auswahl mit Herkunft und Kurzfunktion.`)}<div class="rf-special-toolbar"><input id="amSearch" value="${esc(q)}" placeholder="Material, Quelle oder Effekt suchen …"></div><div class="rf-material-list">${view.map(x=>`<article><div><small>QUALITÄT ${x.quality} · ${x.weight} KG · STAPEL ${x.stack}</small><h3>${esc(x.name)}</h3><p>${esc(x.summary)}</p></div><aside><small>QUELLE</small><b>${esc(x.source)}</b></aside></article>`).join('')}</div></section>`}
function bindArmorMaterials(){navBinds();on('#amSearch','input',e=>inputRefresh('jma_am_q',e.target.value,'#amSearch'))}

function renderDeviations(){const rows=AD().r9?.deviations||[],type=read('jma_dev_type','all'),types=[...new Set(rows.map(x=>x.type))],view=rows.filter(x=>type==='all'||x.type===type);return `<section class="rf-page deviation-page">${hero('DATENBANK // ANOMALIE','ABWEICHLER','Abweichler und Varianten nach Typ, Aktion und Zielverhalten sortiert.')}
 <div class="rf-tabs"><button class="${type==='all'?'active':''}" data-dev-type="all">ALLE</button>${types.map(t=>`<button class="${type===t?'active':''}" data-dev-type="${esc(t)}">${esc(t.toUpperCase())}</button>`).join('')}</div><div class="rf-deviation-grid">${view.map(x=>`<article><span class="rf-deviation-orb">Ψ</span><small>${esc(x.type)}</small><h3>${esc(x.name)}</h3><div class="rf-kv"><span><small>AKTION</small><b>${esc(x.action)}</b></span><span><small>ZIEL</small><b>${esc(x.target)}</b></span></div></article>`).join('')}</div></section>`}
function bindDeviations(){navBinds();qsa('[data-dev-type]').forEach(b=>b.onclick=()=>{write('jma_dev_type',b.dataset.devType);refresh()})}

function renderMods(){const d=AD().r9?.mods||{},rows=d.samples||[],slot=read('jma_mod_slot','all'),q=read('jma_mod_q',''),slots=[...new Set(rows.map(x=>x.slot))],view=filterSearch(rows.filter(x=>slot==='all'||x.slot===slot),q,x=>`${x.name} ${x.slot} ${x.tier}`);return `<section class="rf-page mods-page">${hero('DATENBANK // MODIFIKATION','MODS',`${d.countVisibleFilter||rows.length} Einträge im referenzierten Filterstand; die lokale Auswahl zeigt Slot und Tier.`)}<div class="rf-special-toolbar"><input id="modSearch" value="${esc(q)}" placeholder="Mod suchen …"><select id="modSlot"><option value="all">Alle Slots</option>${slots.map(s=>`<option ${s===slot?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div class="rf-mod-matrix">${view.map(x=>`<article><span>⚙</span><div><small>TIER ${esc(x.tier)} · ${esc(x.slot)}</small><h3>${esc(x.name)}</h3></div></article>`).join('')}</div><div class="rf-chips">${(d.families||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>`}
function bindMods(){navBinds();on('#modSearch','input',e=>inputRefresh('jma_mod_q',e.target.value,'#modSearch'));on('#modSlot','change',e=>{write('jma_mod_slot',e.target.value);refresh()})}

const metric=(x,key)=>key==='dps'?((+x.damage||0)*(+x.fireRate||0)/60):(+x[key]||0);
const norm=(rows,key,val)=>{const nums=rows.map(x=>metric(x,key)),min=Math.min(...nums),max=Math.max(...nums);return max===min?100:(metric({[key]:val},key)-min)/(max-min)*100};
const normMetric=(rows,key,item)=>{const nums=rows.map(x=>metric(x,key)),min=Math.min(...nums),max=Math.max(...nums),val=metric(item,key);return max===min?100:(val-min)/(max-min)*100};
function renderCompareWeapons(){const rows=AD().r12?.weapons||[],modes=AD().r12?.weaponCompareModes||{},mode=read('jma_cmp_mode','dps'),ids=read('jma_cmp_ids',rows.slice(0,3).map(x=>x.id)),sel=[0,1,2].map(i=>rows.find(x=>x.id===ids[i])||rows[i%rows.length]);const weights=modes[mode]?.weights||{};const score=w=>Object.entries(weights).reduce((s,[k,wt])=>s+normMetric(rows,k,w)*wt,0);return `<section class="rf-page compare-page">${hero('LABOR // TRANSPARENTER INDEX','WAFFENVERGLEICH','Bis zu drei Waffen nebeneinander mit offen sichtbaren Gewichtungen. Mechanik-/Build-Synergien werden nicht als pauschaler versteckter Bonus behauptet.')}
 <div class="rf-compare-controls"><label>FOKUS<select id="cmpMode">${Object.entries(modes).map(([k,v])=>`<option value="${k}" ${k===mode?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label>${sel.map((w,i)=>`<label>WAFFE ${i+1}<select data-cmp-index="${i}">${rows.map(x=>`<option value="${x.id}" ${x.id===w.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`).join('')}</div>
 <div class="rf-weight-strip">${Object.entries(weights).map(([k,v])=>`<span><b>${esc(k)}</b>${Math.round(v*100)}%</span>`).join('')}</div><div class="rf-compare-grid">${sel.map(w=>`<article><small>${esc(w.family)} · Tier ${w.tier} · ${esc(w.keyword||'')}</small><h2>${esc(w.name)}</h2><div class="rf-score">${score(w).toFixed(1)}</div><span>VERGLEICHSINDEX</span><div class="rf-kv"><span><small>SCHADEN</small><b>${w.damage}</b></span><span><small>FEUERRATE</small><b>${w.fireRate}</b></span><span><small>MAGAZIN</small><b>${w.mag}</b></span><span><small>REICHWEITE</small><b>${w.range}</b></span><span><small>KRIT</small><b>${w.critRate}%</b></span><span><small>SCHWACHSTELLE</small><b>${w.weakspot}%</b></span></div><p>${esc(w.note||'')}</p></article>`).join('')}</div></section>`}
function bindCompareWeapons(){navBinds();on('#cmpMode','change',e=>{write('jma_cmp_mode',e.target.value);refresh()});qsa('[data-cmp-index]').forEach(s=>s.onchange=()=>{const ids=read('jma_cmp_ids',[]);ids[+s.dataset.cmpIndex]=s.value;write('jma_cmp_ids',ids);refresh()})}

function renderCompareArmors(){const rows=AD().r9?.armorCompare||[],ids=read('jma_armor_cmp',[0,1]),a=rows[ids[0]]||rows[0],b=rows[ids[1]]||rows[1]||rows[0],fields=['hp','pollution','psi','capture','durability','movement','glide'];return `<section class="rf-page compare-page armor-compare-page">${hero('LABOR // SCHUTZWERTE','RÜSTUNGSVERGLEICH','Zwei vorhandene Referenzstufen direkt gegenüberstellen; fehlende Werte bleiben sichtbar leer statt erfunden zu werden.')}
 <div class="rf-compare-controls">${[a,b].map((x,i)=>`<label>RÜSTUNG ${i+1}<select data-acmp-index="${i}">${rows.map((r,idx)=>`<option value="${idx}" ${idx===ids[i]?'selected':''}>${esc(r.name)} · Tier ${r.tier}</option>`).join('')}</select></label>`).join('')}</div><div class="rf-armor-compare"><article><small>Tier ${a.tier}</small><h2>${esc(a.name)}</h2></article><article class="rf-delta-table">${fields.map(k=>{const av=a[k],bv=b[k],delta=(typeof av==='number'&&typeof bv==='number')?bv-av:null;return `<div><small>${esc(k.toUpperCase())}</small><b>${av??'—'}</b><em>${delta===null?'—':(delta>0?'+':'')+delta}</em><b>${bv??'—'}</b></div>`}).join('')}</article><article><small>Tier ${b.tier}</small><h2>${esc(b.name)}</h2></article></div></section>`}
function bindCompareArmors(){navBinds();qsa('[data-acmp-index]').forEach(s=>s.onchange=()=>{const ids=read('jma_armor_cmp',[0,1]);ids[+s.dataset.acmpIndex]=+s.value;write('jma_armor_cmp',ids);refresh()})}

function renderMemetics(){const rows=AD().r9?.memetics||[],q=read('jma_mem_q',''),view=filterSearch(rows,q,x=>x);return `<section class="rf-page memetics-page">${hero('DATENBANK // WISSENSKNOTEN','MEMETIK','Referenzliste der vorhandenen Memetik-Namen; Tech-Rework und Werkbank bleiben als eigener Bereich getrennt.')}
 <div class="rf-special-toolbar"><input id="memSearch" value="${esc(q)}" placeholder="Memetik suchen …">${btnLink('tech-workbench','⚙ TECH-WERKBANK')}</div><div class="rf-memetic-list">${view.map((x,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><small>MEMETIK</small><h3>${esc(x)}</h3></div><i></i></article>`).join('')}</div></section>`}
function bindMemetics(){navBinds();on('#memSearch','input',e=>inputRefresh('jma_mem_q',e.target.value,'#memSearch'))}

function renderVehicles(){const rows=AD().r9?.vehicles||[],q=read('jma_veh_q',''),view=filterSearch(rows,q,x=>x.name);return `<section class="rf-page vehicles-page">${hero('DATENBANK // MOBILITÄT','FAHRZEUGE','Fahrzeugtypen aus dem Referenzstand inklusive hinterlegter Skin-Zähler.')}
 <div class="rf-special-toolbar"><input id="vehSearch" value="${esc(q)}" placeholder="Fahrzeug suchen …"></div><div class="rf-garage">${view.map(x=>`<article><div class="rf-vehicle-silhouette">▱<i></i></div><small>FAHRZEUGTYP</small><h2>${esc(x.name)}</h2><span>${x.skins} Skin${x.skins===1?'':'s'} im Referenzstand</span></article>`).join('')}</div></section>`}
function bindVehicles(){navBinds();on('#vehSearch','input',e=>inputRefresh('jma_veh_q',e.target.value,'#vehSearch'))}

function renderCreatures(){const d=AD().r9?.creatures||{},q=read('jma_cr_q',''),live=filterSearch(d.livestock||[],q,x=>x),other=filterSearch(d.unconfirmed||[],q,x=>x);return `<section class="rf-page creatures-page">${hero('DATENBANK // FAUNA','KREATUREN','Nutztiere und weitere beobachtete Wildtiere bewusst getrennt; unbestätigte Verfügbarkeit bleibt als solche markiert.')}
 <div class="rf-special-toolbar"><input id="creatureSearch" value="${esc(q)}" placeholder="Kreatur suchen …"></div><div class="rf-creature-cols"><section><div class="rf-panel-head"><b>NUTZTIERE / BESTAND</b><small>${live.length}</small></div><div class="rf-creature-grid">${live.map(x=>`<article><span>◌</span><b>${esc(x)}</b></article>`).join('')}</div></section><section><div class="rf-panel-head"><b>WEITERE WILDTIERE</b><small>Verfügbarkeit unbestätigt · ${other.length}</small></div><div class="rf-creature-grid unconfirmed">${other.map(x=>`<article><span>?</span><b>${esc(x)}</b></article>`).join('')}</div></section></div></section>`}
function bindCreatures(){navBinds();on('#creatureSearch','input',e=>inputRefresh('jma_cr_q',e.target.value,'#creatureSearch'))}


const invMaterials=['Metallschrott','Rostige Teile','Teile','Veredelte Teile','Spezialteil','Plastikabfall','Plastik','Feuerfestes Plastik','Technikplastik','Elektronikteile','Kupferbarren','Stahlbarren','Aluminiumbarren','Wolframbarren'];
const twAssets=[
  './assets/techbank/energy-cell.webp',
  './assets/techbank/tech-crate.webp',
  './assets/techbank/sniper-rifle.webp',
  './assets/reference/feature-tech.webp',
  './assets/reference/showcase-items.webp',
  './assets/reference/showcase-weapons.webp'
];
function twTier(x){const hit=String(x.unlock||'').match(/Tier\s*(\d+)/i);return hit?Number(hit[1]):Number.isFinite(x.tier)?x.tier:null}
function twImage(x,i){
  const name=String(x.name||'').toLowerCase();
  if(/chaosium|solar|electric|lantern/.test(name))return twAssets[0];
  if(/backpack|pickaxe|chainsaw|drill|gear/.test(name))return twAssets[1];
  if(x.group==='Waffen'||x.visualWeapon)return twAssets[2];
  return twAssets[3+(i%3)];
}
function twCard(x,i){
  const mats=Array.isArray(x.materials)?x.materials:[];
  const tier=twTier(x,i);
  const tp=x.tp??'—',time=x.time??'—';
  return `<article class="tw-card">
    <div class="tw-card-art"><img src="${esc(twImage(x,i))}" alt="" title="Illustration, kein verifiziertes Itembild" loading="lazy"><span class="tw-tier">${tier===null?'TIER OFFEN':'TIER '+esc(tier)}</span><span class="tw-quality">${set('jma_tech_seen').has(x.name)?'ANALYSIERT':'UNGESEHEN'}</span></div>
    <div class="tw-card-body">
      <small class="tw-card-type">${esc(x.group||'TECH')}</small>
      <h3>${esc(x.name)}</h3>
      <p>${esc(x.unlock||'Analyseprofil / visuelle Vorschau')}</p>
      <div class="tw-materials">${mats.length?mats.map(({name,qty},mi)=>`<span><i>◆</i><b>${esc(name)}</b><em>×${qty}</em></span>`).join(''):'<span>Materialmengen nicht dokumentiert.</span>'}</div>
      <button type="button" data-tech-seen="${esc(x.name)}" aria-pressed="${set('jma_tech_seen').has(x.name)}">${set('jma_tech_seen').has(x.name)?'✓ ANALYSIERT':'ALS ANALYSIERT MARKIEREN'}</button><footer><span><small>TP / ZYKLUS</small><b>${esc(tp)}</b></span><span><small>ZEIT</small><b>${esc(time)}${time==='—'?'':' s'}</b></span><button type="button" data-tech-detail="${esc(x.name)}" aria-label="Details">→</button></footer>
    </div>
  </article>`;
}
function twRecipeMedia(recipe){return `<div class="tw-recipe-image-missing"><small>KEIN VERIFIZIERTES ITEMBILD HINTERLEGT</small></div>`}

function twHero(d){
  return `<header class="tw-hero">
    <div class="tw-hero-copy">
      <div class="tw-kicker"><span>✦</span> SYSTEME / HERSTELLUNG</div>
      <h1>TECH-<span>WERKBANK</span></h1>
      <p>Reverse Engineering, Erfindung und Fertigungsformeln in einem kompakten Werkstatt-Terminal. Bestehende R12-Daten bilden die Basis dieser visuellen Arbeitsoberfläche.</p>
      <div class="tw-hero-metrics">
        <article><i>⌁</i><div><b>${(d.reverseSamples||[]).length}</b><span>REVERSE-EINTRÄGE</span><small>Gesammelte Daten</small></div></article>
        <article><i>◇</i><div><b>${invMaterials.length}</b><span>ERFINDUNGS-POOL</span><small>Materialkombinationen</small></div></article>
        <article><i>▦</i><div><b>${(d.recipes||[]).length}</b><span>FERTIGUNGSFORMELN</span><small>Geprüfte Rezepte</small></div></article>
      </div>
    </div>
    <div class="tw-hero-focus" aria-hidden="true">
      <div class="tw-focus-ring"></div>
      <img src="./assets/techbank/energy-cell.webp" alt="">
      <small>WORKBENCH // ONLINE</small>
    </div>
  </header>`;
}
function twTabs(tab){
  const tabs=[
    ['reverse','⚙','REVERSE ENGINEERING','Items zerlegen & analysieren'],
    ['invention','◇','ERFINDUNG','Material-Mix & Pool'],
    ['recipes','▦','FERTIGUNGSRECHNER','Formeln & Materialbedarf']
  ];
  return `<nav class="tw-mode-tabs" aria-label="Techwerkbank-Modus">${tabs.map(([id,icon,title,sub])=>`<button type="button" class="${tab===id?'active':''}" data-tech-tab="${id}"><i>${icon}</i><span><b>${title}</b><small>${sub}</small></span><em>→</em></button>`).join('')}</nav>`;
}
function renderTechWorkbench(){
  const d=AD().r12?.techWorkbench||{},storedTab=read('jma_tech_tab','reverse'),tab=['reverse','invention','recipes'].includes(storedTab)?storedTab:'reverse',q=read('jma_tech_q','');
  const reversePool=d.reverseSamples||[],category=read('jma_tech_cat','all'),tier=read('jma_tech_tier','all'),sort=read('jma_tech_sort','name'),only=read('jma_tech_seen_only',false),unseen=read('jma_tech_unseen_only',false),high=read('jma_tech_high_only',false),seen=set('jma_tech_seen'),view=read('jma_tech_view','grid');
  const reverse=filterSearch(reversePool,q,x=>`${x.name} ${x.group} ${x.unlock}`).filter(x=>(category==='all'||x.group===category)&&(tier==='all'||String(twTier(x))===tier)&&(!only||seen.has(x.name))&&(!unseen||!seen.has(x.name))&&(!high||twTier(x)>=4)).sort((a,b)=>sort==='tier'?(twTier(a)??99)-(twTier(b)??99):a.name.localeCompare(b.name,'de'));
  const defaultRecipe=(d.recipes||[]).find(x=>x.id==='recipe-storage-battery')||d.recipes?.[0],recipeId=read('jma_recipe_id',defaultRecipe?.id),recipe=(d.recipes||[]).find(x=>x.id===recipeId)||defaultRecipe,storedQty=Number(read('jma_recipe_qty',1)),qty=Number.isFinite(storedQty)?Math.max(1,Math.min(99,Math.floor(storedQty))):1,inv=read('jma_invention_slots',Array(9).fill(''));
  const categories=[['all',reversePool.length],...[...new Set(reversePool.map(x=>x.group))].map(g=>[g,reversePool.filter(x=>x.group===g).length])];
  const reversePanel=`<div class="tw-workspace">
    <aside class="tw-sidebar">
      <section class="tw-side-panel"><header><small>KATEGORIEN</small><b>ARCHIVFILTER</b></header>
        <div class="tw-category-list">${categories.map(([k,v],i)=>`<button type="button" data-tech-cat="${esc(k)}" class="${k===category?'active':''}"><i>${['◉','⚒','✚','◆','⌖','⋯'][i%6]}</i><span>${k==='all'?'Alle':esc(k)}</span><b>${v}</b></button>`).join('')}</div>
      </section>
      <section class="tw-side-panel tw-side-status"><header><small>FILTER</small><b>STATUS / QUALITÄT</b></header>
        <label><input id="techSeenOnly" type="checkbox" ${only?'checked':''}> Analysiert</label>
        <label><input id="techUnseenOnly" type="checkbox" ${unseen?'checked':''}> Neu / ungesehen</label>
        <label><input id="techHighOnly" type="checkbox" ${high?'checked':''}> Tier IV–VI</label>
        <div><span>DATENSATZ</span><b>R12 // 2026</b></div>
      </section>
    </aside>
    <main class="tw-main">
      <div class="tw-toolbar">
        <label class="tw-search"><i>⌕</i><input id="techSearch" value="${esc(q)}" placeholder="Werkzeug, Waffe, Gruppe oder Freischaltung suchen …"></label>
        <select id="techCategory" aria-label="Kategorie">${categories.map(([g])=>`<option value="${esc(g)}" ${g===category?'selected':''}>${g==='all'?'Alle Kategorien':esc(g)}</option>`).join('')}</select>
        <select id="techTier" aria-label="Tier"><option value="all">Alle Tiers</option>${[...new Set(reversePool.map(twTier).filter(x=>x!==null))].sort().map(t=>`<option value="${t}" ${tier===String(t)?'selected':''}>Tier ${t}</option>`).join('')}</select>
        <select id="techSort" aria-label="Sortierung"><option value="name">Name A–Z</option><option value="tier" ${sort==='tier'?'selected':''}>Tier</option></select>
        <div class="tw-view"><button data-tech-view="grid" type="button" aria-label="Raster">▦</button><button data-tech-view="list" type="button" aria-label="Liste">☷</button></div>
      </div>
      <div class="tw-result-head"><div><small>REVERSE ENGINEERING</small><h2>ANALYSE-DATENSÄTZE</h2></div><span><b>${reverse.length}</b> sichtbare Vorschau-Einträge</span></div>
      <div class="tw-card-grid ${view==='list'?'list':''}">${reverse.map(twCard).join('')||`<div class="tw-empty"><b>KEINE TREFFER</b><span>Suche anpassen, um weitere Tech-Datensätze zu sehen.</span></div>`}</div>
    </main>
  </div>`;
  const inventionPanel=`<div class="tw-workspace tw-invention-workspace">
    <aside class="tw-sidebar">
      <section class="tw-side-panel"><header><small>POOL-UMFANG</small><b>REFERENZDATEN</b></header>
        <div class="tw-pool-counts">${arr('jma_invention_saved').map(x=>`<div><span>${esc(x.name)}</span><button data-inv-load="${esc(x.id)}">LADEN</button><button data-inv-delete="${esc(x.id)}">×</button></div>`).join('')||'Noch keine gespeicherten Mischungen.'}</div>
      </section>
      <section class="tw-side-panel tw-side-status"><header><small>SYSTEMHINWEIS</small><b>ERFINDUNG</b></header><p>Material-Mixe erzeugen keinen garantiert festen Output. Die vorhandene R12-Trennung bleibt erhalten.</p></section>
    </aside>
    <main class="tw-main">
      <div class="tw-result-head"><div><small>ERFINDUNG</small><h2>MATERIAL-MIX PLANEN</h2></div><span>2–9 Materialien kombinieren</span></div>
      <div class="tw-invention-stage">
        <div class="tw-invention-core"><img src="./assets/techbank/tech-crate.webp" alt=""><span>EXPERIMENTAL INPUT</span></div>
        <div class="tw-slot-grid">${Array.from({length:9},(_,i)=>`<div class="tw-slot"><small>SLOT ${String(i+1).padStart(2,'0')}</small><details class="tw-material-select"><summary><span>${esc(inv[i]||'leer')}</span><i>⌄</i></summary><div class="tw-material-menu" role="listbox" aria-label="Material für Slot ${i+1}"><button type="button" class="${!inv[i]?'selected':''}" data-inv-slot="${i}" data-inv-value="">leer</button>${invMaterials.map(x=>`<button type="button" class="${inv[i]===x?'selected':''}" data-inv-slot="${i}" data-inv-value="${esc(x)}">${esc(x)}</button>`).join('')}</div></details><i>＋</i></div>`).join('')}</div>
      </div>
      <label class="tw-field">NAME<input id="invName" maxlength="80" placeholder="Meine Materialmischung"></label><p id="invMessage" role="status"></p><div class="tw-stage-actions"><button class="ghost-btn" id="invClear" type="button">AUSWAHL LEEREN</button><button class="cyan-btn compact" id="invSave" type="button">MISCHUNG SPEICHERN →</button></div>
    </main>
  </div>`;
  const recipePanel=recipe?`<div class="tw-workspace tw-recipe-workspace">
    <aside class="tw-sidebar">
      <section class="tw-side-panel"><header><small>FORMEL</small><b>AUSWAHL</b></header>
        <label class="tw-field">FERTIGUNGSFORMEL<select id="recipeSelect">${d.recipes.map(r=>`<option value="${esc(r.id)}" ${r.id===recipe.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>
        <label class="tw-field">MENGE<input id="recipeQty" type="number" min="1" max="99" value="${qty}"></label>
        <div class="tw-recipe-output"><small>OUTPUT</small><b>${esc(recipe.output)}</b><span>${esc(recipe.unlock)}</span></div>
      </section>
      <section class="tw-side-panel tw-side-status"><header><small>PRÜFSTATUS</small><b>FORMELDATEN</b></header><p>${esc(recipe.verified)}<br>${esc(recipe.lastChecked)}</p></section>
    </aside>
    <main class="tw-main">
      <div class="tw-result-head"><div><small>FERTIGUNGSRECHNER</small><h2>MATERIALBEDARF</h2></div><span><b>${qty}×</b> Produktionslauf</span></div>
      <div class="tw-recipe-showcase">
        <article class="tw-recipe-product"><div><small>WERKBANK-OUTPUT</small><h3>${esc(recipe.name)}</h3><p>${esc(recipe.unlock)}</p></div>${twRecipeMedia(recipe)}</article>
        <div class="tw-recipe-materials">${recipe.materials.map((m,i)=>`<article><i>${['◆','⬡','▰','◇'][i%4]}</i><div><small>MATERIAL ${String(i+1).padStart(2,'0')}</small><b>${esc(m.name)}</b><span>${m.qty} × ${qty}</span></div><em>${m.qty*qty}</em></article>`).join('')}</div>
      </div>
      <div class="tw-stage-actions">${btnLink('submissions','FORMEL / KORREKTUR EINREICHEN')}</div>
    </main>
  </div>`:'';
  return `<section class="rf-page tech-page tw-page">${twHero(d)}${twTabs(tab)}${tab==='reverse'?reversePanel:''}${tab==='invention'?inventionPanel:''}${tab==='recipes'?recipePanel:''}</section>`;
}
function bindTechWorkbench(){navBinds();qsa('[data-tech-tab]').forEach(b=>b.onclick=()=>{write('jma_tech_tab',b.dataset.techTab);refresh()});qsa('[data-tech-cat]').forEach(b=>b.onclick=()=>{write('jma_tech_cat',b.dataset.techCat);refresh()});on('#techCategory','change',e=>{write('jma_tech_cat',e.target.value);refresh()});on('#techUnseenOnly','change',e=>{write('jma_tech_unseen_only',e.target.checked);refresh()});on('#techHighOnly','change',e=>{write('jma_tech_high_only',e.target.checked);refresh()});on('#techSearch','input',e=>inputRefresh('jma_tech_q',e.target.value,'#techSearch'));for(const [id,key]of [['techTier','jma_tech_tier'],['techSort','jma_tech_sort'],['techSeenOnly','jma_tech_seen_only']])on('#'+id,'change',e=>{write(key,id==='techSeenOnly'?e.target.checked:e.target.value);refresh()});qsa('[data-tech-view]').forEach(b=>b.onclick=()=>{write('jma_tech_view',b.dataset.techView);refresh()});qsa('[data-tech-seen]').forEach(b=>b.onclick=()=>{const s=set('jma_tech_seen');s.has(b.dataset.techSeen)?s.delete(b.dataset.techSeen):s.add(b.dataset.techSeen);putSet('jma_tech_seen',s);refresh()});qsa('[data-tech-detail]').forEach(b=>b.onclick=()=>{const x=AD().r12.techWorkbench.reverseSamples.find(x=>x.name===b.dataset.techDetail);let dialog=qs('#techDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='techDialog';document.body.appendChild(dialog)}dialog.innerHTML=`<button class="dialog-close" aria-label="Details schließen">×</button><small>${esc(x.group)}</small><h2>${esc(x.name)}</h2><p>${esc(x.unlock)}</p>${metrics([[x.tp,'TP pro Zyklus'],[x.time,'Sekunden']])}<p>Materialmengen sind für diese Analyse nicht dokumentiert.</p>`;dialog.querySelector('button').onclick=()=>dialog.close();dialog.showModal()});qsa('[data-inv-slot]').forEach(b=>b.onclick=()=>{const a=read('jma_invention_slots',Array(9).fill(''));a[+b.dataset.invSlot]=b.dataset.invValue||'';write('jma_invention_slots',a);refresh()});on('#invClear','click',()=>{write('jma_invention_slots',Array(9).fill(''));refresh()});on('#invSave','click',()=>{const slots=read('jma_invention_slots',Array(9).fill('')),name=qs('#invName').value.trim();if(name.length<2||!slots.some(Boolean)){qs('#invMessage').textContent='Name und mindestens ein Material erforderlich.';return}const rows=arr('jma_invention_saved');rows.unshift({id:uid('mix'),name,slots,created:new Date().toISOString()});write('jma_invention_saved',rows);refresh();toast('Materialmischung gespeichert.')});qsa('[data-inv-load]').forEach(b=>b.onclick=()=>{const x=arr('jma_invention_saved').find(x=>x.id===b.dataset.invLoad);write('jma_invention_slots',x.slots);refresh();qs('#invName').value=x.name});qsa('[data-inv-delete]').forEach(b=>b.onclick=()=>{write('jma_invention_saved',arr('jma_invention_saved').filter(x=>x.id!==b.dataset.invDelete));refresh()});on('#recipeSelect','change',e=>{write('jma_recipe_id',e.target.value);refresh()});on('#recipeQty','input',e=>inputRefresh('jma_recipe_qty',Math.min(99,Math.max(1,Math.floor(+e.target.value||1))),'#recipeQty',320))}


function renderExchange(){const posts=arr('jma_exchange_posts'),builds=arr('jma_saved_builds');return `<section class="rf-page exchange-page">${hero('COMMUNITY // WERKSTATT','COMMUNITY-WERKSTATT','Lokales Teilen gespeicherter Builds sowie Suche/Biete-Posts. Echtgeld-Handel ist gemäß vorhandener Projektregel nicht vorgesehen.')}
 <div class="rf-exchange-layout"><form class="rf-panel" id="exchangeForm"><div class="rf-panel-head"><b>BEITRAG ERSTELLEN</b><small>lokal</small></div><label>TYP<select name="type"><option>Build teilen</option><option>Suche</option><option>Biete</option></select></label><label>BUILD<select name="build"><option value="">Kein Build</option>${builds.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></label><label>TITEL<input name="title" required></label><label>TEXT<textarea name="text" required></textarea></label><button class="cyan-btn compact">VERÖFFENTLICHUNG LOKAL SIMULIEREN</button><p class="rf-note">Kein Server-Backend: Beitrag bleibt in diesem Browser.</p></form><main class="rf-exchange-feed">${posts.map(p=>{const b=builds.find(x=>x.id===p.build);return `<article><header><small>${esc(p.type)} · ${fmt(p.created)}</small><h2>${esc(p.title)}</h2></header><p>${esc(p.text)}</p>${b?`<div class="rf-shared-build"><b>⚒ ${esc(b.name)}</b><span>${Object.values(b.slots||{}).filter(Boolean).length} belegte Slots</span><button data-exchange-copy="${esc(b.id)}">BUILD KOPIEREN</button></div>`:''}<button data-exchange-delete="${esc(p.id)}">BEITRAG LÖSCHEN</button></article>`}).join('')||empty('Noch keine Werkstatt-Beiträge')}</main></div></section>`}
function bindExchange(){navBinds();on('#exchangeForm','submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),rows=arr('jma_exchange_posts');rows.unshift({id:uid('exchange'),type:fd.get('type'),build:fd.get('build'),title:String(fd.get('title')).trim(),text:String(fd.get('text')).trim(),created:new Date().toISOString()});write('jma_exchange_posts',rows);refresh()});qsa('[data-exchange-delete]').forEach(b=>b.onclick=()=>{write('jma_exchange_posts',arr('jma_exchange_posts').filter(x=>x.id!==b.dataset.exchangeDelete));refresh()});qsa('[data-exchange-copy]').forEach(b=>b.onclick=()=>{const x=arr('jma_saved_builds').find(v=>v.id===b.dataset.exchangeCopy);if(!x)return;const copy={...x,id:uid('build'),name:`${x.name} · Kopie`,updated:new Date().toISOString()};const rows=arr('jma_saved_builds');rows.unshift(copy);write('jma_saved_builds',rows);toast('Build als lokale Kopie gespeichert.')})}

function downloadJSON(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
let profileDraft=null;
async function saveProfileAppearance(name){const p=appearance(profileDraft||appearance());await globalThis.JMA_AUTH.updateProfile({name,avatar:p.avatar,appearance:p});write('jma_profile_appearance',p)}
function bindProfileAppearance(){
  on('#profileNameForm','submit',async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name').trim();try{await saveProfileAppearance(name);toast('Anzeigename gespeichert.');refresh()}catch(error){toast(error?.message||'Anzeigename konnte nicht gespeichert werden.')}});
 profileDraft=appearance();const drawer=qs('#profileEditDrawer'),nav=qs('.profile-ref-drawer-nav'),content=qs('.profile-ref-drawer-content'),embedded=!!drawer?.classList.contains('settings-profile-editor');
 if(!embedded&&nav&&content)for(const [id,title] of [['frames','RAHMEN'],['decorations','RINGE & KRÄNZE'],['trophies','TROPHÄEN']]){const b=document.createElement('button');b.type='button';b.dataset.profileEditTab=id;b.textContent=title;nav.append(b);const panel=document.createElement('section');panel.dataset.profileEditPanel=id;content.append(panel)}
 const choices=(kind,field)=>`<div class="profile-choices ${field}-choices"><button type="button" data-profile-choice="${field}" data-value="${field==='banner'?'kartenwelt':'none'}"><span>Standard</span></button>${globalThis.PROFILE_ASSETS[kind].map(x=>`<button type="button" data-profile-choice="${field}" data-value="${x.id}" aria-pressed="${profileDraft[field]===x.id}"><img src="${esc(x.src)}" alt=""><span>${esc(x.name)}</span></button>`).join('')}</div>`;
 const avatarChoices=()=>{
   const frame=globalThis.PROFILE_ASSETS.frames.find(x=>x.id===profileDraft.frame),initial=esc((account()?.name||'?').trim().charAt(0).toUpperCase()||'?');
   const frameLayer=()=>`<img class="avatar-choice-frame" data-avatar-choice-frame src="${frame?esc(frame.src):''}" alt="" ${frame?'':'hidden'}>`;
   return `<div class="profile-choices avatar-choices">
     <button type="button" data-profile-choice="avatar" data-value="none" aria-pressed="${profileDraft.avatar==='none'}">
       <span class="avatar-choice-stage"><i class="avatar-choice-initial">${initial}</i>${frameLayer()}</span>
       <span>Standard</span>
     </button>
     ${globalThis.PROFILE_ASSETS.avatars.map(x=>`<button type="button" data-profile-choice="avatar" data-value="${x.id}" aria-pressed="${profileDraft.avatar===x.id}">
       <span class="avatar-choice-stage"><img class="avatar-choice-image" src="${esc(x.src)}" alt="">${frameLayer()}</span>
       <span>${esc(x.name)}</span>
     </button>`).join('')}
   </div>`;
 };
 const fill=(id,html)=>qs(`[data-profile-edit-panel="${id}"]`).innerHTML=html+'<button type="button" data-profile-save>ÄNDERUNGEN SPEICHERN</button><p class="profile-save-message" role="status"></p>';
 fill('avatar','<h3>AVATAR</h3><p class="profile-choice-hint">Vorschau mit deinem aktuell gewählten Rahmen.</p><label class="file-button">EIGENEN AVATAR HOCHLADEN<input id="avatarUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+avatarChoices());
 fill('frames','<h3>AVATARRAHMEN</h3>'+choices('frames','frame'));
 fill('banner','<h3>PROFILBANNER</h3>'+choices('banners','banner'));
 fill('colors','<h3>PROFILFARBEN</h3><div class="profile-choices">'+Object.entries(profileColors).map(([id,color])=>`<button type="button" data-profile-choice="color" data-value="${id}" style="border-color:${color}">${id}</button>`).join('')+'</div>');
 fill('about',`<h3>ÜBER MICH</h3><label>PROFILTEXT<textarea id="profileBio" maxlength="280">${esc(profileDraft.bio)}</textarea></label>`);
 fill('highlights',`<h3>BUILD-HIGHLIGHT</h3><select id="profileHighlight"><option value="">Neuester Build</option>${arr('jma_saved_builds').map(x=>`<option value="${esc(x.id)}" ${profileDraft.highlight===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`);
 fill('widgets','<h3>PROFILMODULE</h3>'+['gallery','builds','routes','activities','showcase'].map(id=>`<label><input type="checkbox" data-profile-widget="${id}" ${profileDraft.widgets.includes(id)?'checked':''}> ${id}</label>`).join(''));
 fill('decorations','<h3>RINGE</h3><div class="profile-choices">'+['none','cyan','red','gold'].map(id=>`<button type="button" data-profile-choice="ring" data-value="${id}">${id}</button>`).join('')+'</div><h3>KRÄNZE</h3><div class="profile-choices">'+['none','orbit','laurel'].map(id=>`<button type="button" data-profile-choice="wreath" data-value="${id}">${id}</button>`).join('')+'</div>');
 fill('trophies','<h3>ARCHIV-TROPHÄEN</h3><div class="profile-choices"><button type="button" data-profile-choice="trophy" data-value="">Ohne</button>'+achievements().map(t=>`<button type="button" data-profile-choice="trophy" data-value="${t.id}" ${t.earned?'':'disabled'}>${t.icon} ${esc(t.name)}${t.earned?'':' · gesperrt'}</button>`).join('')+'</div>');
 const preview=()=>{
   qs('.profile-ref-editor-avatar').innerHTML=avatar(profileDraft);
   qsa('[data-profile-choice]').forEach(b=>{const selected=profileDraft[b.dataset.profileChoice]===b.dataset.value;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
   const frame=globalThis.PROFILE_ASSETS.frames.find(x=>x.id===profileDraft.frame);
   qsa('[data-avatar-choice-frame]').forEach(img=>{if(frame){img.src=frame.src;img.hidden=false}else{img.removeAttribute('src');img.hidden=true}});
   globalThis.JMA_MEDIA.hydrate(drawer);
   updateProfileSettingsLivePreview();
 };
 qsa('[data-profile-choice]').forEach(b=>b.onclick=()=>{profileDraft[b.dataset.profileChoice]=b.dataset.value;preview()});
 on('#profileBio','input',e=>{profileDraft.bio=e.target.value;updateProfileSettingsLivePreview('about')});
 on('#profileHighlight','change',e=>{profileDraft.highlight=e.target.value;updateProfileSettingsLivePreview('highlights')});
 on('#profileNameForm input[name="name"]','input',()=>updateProfileSettingsLivePreview('general'));
 qsa('[data-profile-widget]').forEach(el=>el.onchange=()=>{profileDraft.widgets=el.checked?[...new Set([...profileDraft.widgets,el.dataset.profileWidget])]:profileDraft.widgets.filter(x=>x!==el.dataset.profileWidget)});
 on('#avatarUpload','change',async e=>{try{profileDraft.avatar=await globalThis.JMA_MEDIA.save(e.target.files[0]);preview()}catch(error){toast(error.message)}});
 qsa('[data-profile-save]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await saveProfileAppearance(qs('#profileNameForm input[name="name"]').value.trim());refresh();toast('Profil gespeichert.')}catch(error){b.parentElement.querySelector('.profile-save-message').textContent=error.message;b.disabled=false}});
 if(globalThis.__profileDrawerKey)document.removeEventListener('keydown',globalThis.__profileDrawerKey);globalThis.__profileDrawerKey=e=>{if(!drawer?.isConnected||drawer.hidden||!drawer.classList.contains('profile-ref-drawer'))return;if(e.key==='Escape'){qs('#profileEditClose').click();qs('[data-profile-edit-open]')?.focus()}if(e.key==='Tab'){const els=[...drawer.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled&&x.getClientRects().length);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',globalThis.__profileDrawerKey);
 const trophy=achievements().find(t=>t.id===profileDraft.trophy&&t.earned);if(trophy){const identity=qs('.profile-ref-identity');if(identity){const badge=document.createElement('span');badge.textContent=trophy.icon+' '+trophy.name;identity.append(badge)}}
 const showcase=qs('.profile-ref-slot-row');if(showcase){showcase.innerHTML=[...set('jma_favorites')].map(id=>catalog().find(x=>x.id===id)).filter(Boolean).slice(0,4).map(x=>`<span title="${esc(x.name_de)}">★ ${esc(x.name_de)}</span>`).join('')||'<span>+</span><span>+</span><span>+</span><span>+</span>';showcase.closest('section').hidden=!profileDraft.widgets.includes('showcase')}
 preview();
}

const R={dashboard:renderDashboard,news:renderNews,map:renderMap,hunt:renderHunt,routes:renderRoutes,planner:renderPlanner,guides:renderGuides,patchwatch:renderPatchwatch,secrets:renderSecrets,builds:renderBuilds,community:renderCommunity,submissions:renderSubmissions,profile:renderProfile,'weapon-blueprints':renderWeaponBlueprints,'armor-blueprints':renderArmorBlueprints,'armor-materials':renderArmorMaterials,deviations:renderDeviations,mods:renderMods,'compare-weapons':renderCompareWeapons,'compare-armors':renderCompareArmors,memetics:renderMemetics,vehicles:renderVehicles,creatures:renderCreatures,'tech-workbench':renderTechWorkbench,exchange:renderExchange};
const B={dashboard:navBinds,news:bindNews,map:bindMap,hunt:bindHunt,routes:bindRoutes,planner:bindPlanner,guides:bindGuides,patchwatch:bindPatchwatch,secrets:bindSecrets,builds:bindBuilds,community:bindCommunity,submissions:bindSubmissions,profile:bindProfile,'weapon-blueprints':bindWeaponBlueprints,'armor-blueprints':bindArmorBlueprints,'armor-materials':bindArmorMaterials,deviations:bindDeviations,mods:bindMods,'compare-weapons':bindCompareWeapons,'compare-armors':bindCompareArmors,memetics:bindMemetics,vehicles:bindVehicles,creatures:bindCreatures,'tech-workbench':bindTechWorkbench,exchange:bindExchange};
globalThis.FULL_ROUTE_RENDERERS=R;globalThis.FULL_ROUTE_BINDERS=B;
})();
