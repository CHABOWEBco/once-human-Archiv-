(()=>{
'use strict';

const ADMIN_VIEWS=[
  ['overview','Übersicht','⌂'],
  ['content','Inhalte & Seiten','▤'],
  ['editor','Inhaltseditor','✎'],
  ['assets','Asset-Bibliothek','▧'],
  ['map','Karte & Marker','⌖'],
  ['moderation','Moderation','⚑'],
  ['users','Nutzer & Rollen','♙'],
  ['audit','Audit & Aktivität','≡'],
  ['system','System & Sicherheit','◇']
];
const ADMIN_ROLES=new Set(['moderator','admin','owner']);
const PRIVILEGED=new Set(['admin','owner']);
const KEY='oha:admin-preview:view';
const account=()=>globalThis.JMA_AUTH?.getAccount?.()||null;
const authState=()=>globalThis.JMA_AUTH?.getState?.()||{};
const role=()=>String(account()?.role||'').toLowerCase();
const read=(key,fallback)=>globalThis.JMA_STORE?.read?.(key,fallback)??fallback;
const list=(key)=>{const value=read(key,[]);return Array.isArray(value)?value:[]};
const catalog=()=>Array.isArray(globalThis.CATALOG_DATA?.entries)?globalThis.CATALOG_DATA.entries:[];
const archive=()=>globalThis.ARCHIVE_DATA||{};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const fmt=value=>{try{return new Date(value).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return '—'}};
let editorWorking=null,editorBase=null,editorRevision=1,editorIsNew=false;
const routeCount=()=>new Set([...ROUTES.map(route=>route.id),...Object.keys(globalThis.FULL_ROUTE_RENDERERS||{})].map(id=>ROUTE_ALIASES[id]||id)).size;

function getView(){
  try{
    const value=sessionStorage.getItem(KEY)||'overview';
    return ADMIN_VIEWS.some(item=>item[0]===value)?value:'overview';
  }catch{return 'overview'}
}
function setView(value){
  try{sessionStorage.setItem(KEY,value)}catch{}
}
function allowed(view){
  const r=role();
  if(!ADMIN_ROLES.has(r)) return false;
  if(['users','audit','system'].includes(view)) return PRIVILEGED.has(r);
  return true;
}
function localStats(){
  const baseMarkers=Array.isArray(archive().map?.markers)?archive().map.markers:[];
  const scenarios=Array.isArray(archive().map?.scenarios)?archive().map.scenarios:[];
  const news=Array.isArray(archive().seed?.news)?archive().seed.news:[];
  return {
    catalog:catalog().length,
    categories:Array.isArray(globalThis.CATALOG_DATA?.categories)?globalThis.CATALOG_DATA.categories.length:0,
    baseMarkers:baseMarkers.length,
    localMarkers:list('jma_custom_markers').length,
    scenarios:scenarios.length,
    submissions:list('jma_submissions').length,
    posts:list('jma_community_posts').length,
    builds:list('jma_saved_builds').length,
    routes:list('jma_routes').length,
    news:news.length
  };
}
function badge(text,tone){
  return '<span class="admin-badge '+(tone||'neutral')+'">'+esc(text)+'</span>';
}
function nav(){
  const current=getView();
  return '<aside class="admin-rail">'+
    '<div class="admin-rail-brand"><span class="admin-rail-mark">A</span><span><small>ONCE HUMAN ARCHIV</small><strong>ADMIN BACKEND</strong></span></div>'+
    '<nav aria-label="Adminbereiche">'+ADMIN_VIEWS.map(item=>{
      const locked=!allowed(item[0]);
      return '<button type="button" class="admin-nav-item '+(current===item[0]?'active ':'')+(locked?'locked':'')+'" data-admin-view="'+item[0]+'" '+(locked?'disabled aria-disabled="true"':'')+'><span>'+item[2]+'</span><b>'+esc(item[1])+'</b>'+(locked?'<em>LOCK</em>':'')+'</button>';
    }).join('')+'</nav>'+
    '<div class="admin-rail-bottom"><div class="admin-mini-status"><i></i><span><b>Preview-Safe-Mode</b><small>Keine unsicheren Admin-Mutationen</small></span></div><button type="button" data-admin-go="settings">⚙ Website-Einstellungen</button><button type="button" data-admin-go="home">← Website öffnen</button></div>'+
  '</aside>';
}
function shell(content){
  const a=account(),r=role();
  return '<section class="admin-panel-page">'+
    '<div class="admin-ambient" aria-hidden="true"></div>'+
    '<div class="admin-shell">'+nav()+
      '<div class="admin-main">'+
        '<header class="admin-topline"><div><span class="admin-eyebrow">ADMINISTRATION / '+esc(getView().toUpperCase())+'</span><h1>Archiv Control Center</h1><p>Website-Inhalte, Community, Karte und Zugriffsbereiche in einer zentralen Arbeitsoberfläche.</p></div>'+
        '<div class="admin-identity"><span class="admin-avatar">'+esc((a?.name||a?.email||'A').slice(0,1).toUpperCase())+'</span><div><small>ANGEMELDET ALS</small><b>'+esc(a?.name||a?.email||'Meta-Human')+'</b><span>'+badge(r||'ohne rolle',r==='owner'?'owner':r==='admin'?'admin':'moderator')+'</span></div></div></header>'+
        content+
      '</div>'+
    '</div>'+
  '</section>';
}
function accessScreen(){
  const a=account(),r=role();
  return '<section class="admin-panel-page admin-access-page"><div class="admin-access-card"><span class="admin-access-icon">◇</span><small>GESCHÜTZTER BEREICH</small><h1>Admin Backend</h1><p>'+(a?'Dein Konto ist angemeldet, besitzt aber aktuell keine freigegebene Admin-Rolle.':'Melde dich zuerst mit deinem Archivkonto an.')+'</p><div class="admin-access-facts"><span><b>Konto</b><em>'+esc(a?.email||'nicht angemeldet')+'</em></span><span><b>Erkannte Rolle</b><em>'+esc(r||'keine')+'</em></span><span><b>Zugelassen</b><em>moderator · admin · owner</em></span></div><button class="admin-primary" type="button" data-admin-go="profile">Profil & Sicherheit öffnen →</button></div></section>';
}
function metric(icon,value,label,sub,tone){
  return '<article class="admin-metric '+(tone||'')+'"><span class="admin-metric-icon">'+icon+'</span><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><p>'+esc(sub)+'</p></div></article>';
}
function panelHead(kicker,title,action){
  return '<header class="admin-panel-head"><div><small>'+esc(kicker)+'</small><h2>'+esc(title)+'</h2></div>'+(action||'')+'</header>';
}
function overview(){
  const s=localStats();
  const queue=list('jma_submissions').slice(0,4);
  const modules=[
    ['Datenbank',s.catalog+' Einträge','database','▱','Katalog & Detaildaten'],
    ['Live-Karte',(s.baseMarkers+s.localMarkers)+' Marker','map','⌖','Marker, Filter & Routen'],
    ['Techwerkbank','Route aktiv','tech-workbench','⚙','Analyse & Werkzeuge'],
    ['Neuigkeiten',s.news+' Meldungen','news','▤','Archivmeldungen'],
    ['Community',s.posts+' lokale Beiträge','community','♙','Räume & Beiträge'],
    ['Guides','Route aktiv','guides','◫','Wissensartikel']
  ];
  return '<div class="admin-dashboard">'+
    '<section class="admin-hero"><div class="admin-hero-copy"><span class="admin-eyebrow">OWNER / ADMIN WORKSPACE</span><h2>Steuere das Archiv.<br><em>Ohne die Website zu zerlegen.</em></h2><p>Das Panel arbeitet auf einer separaten Vorschau. Vorhandene Daten werden gelesen; sensible Backend-Aktionen bleiben gesperrt, bis dafür echte serverseitige Rechte vorhanden sind.</p><div class="admin-hero-actions"><button class="admin-primary" type="button" data-admin-view="content">Inhalte verwalten →</button><button class="admin-secondary" type="button" data-admin-go="home">Website ansehen</button></div></div><div class="admin-hero-signal"><div class="signal-orbit"><span></span><i></i></div><small>CONTROL LAYER</small><b>PREVIEW</b><em>isolierter Arbeitsstand</em></div></section>'+
    '<section class="admin-metrics">'+
      metric('▱',s.catalog,'Katalogeinträge',s.categories+' Kategorien','cyan')+
      metric('⌖',s.baseMarkers+s.localMarkers,'Kartenmarker',s.localMarkers+' lokal ergänzt','coral')+
      metric('⚑',s.submissions,'Einreichungen','lokale Prüfqueue','amber')+
      metric('◇',routeCount(),'Website-Routen','bestehender Seitenbestand','violet')+
    '</section>'+
    '<div class="admin-grid admin-grid-overview">'+
      '<section class="admin-glass admin-modules">'+panelHead('WEBSITE','Bereiche & Inhalte','<button type="button" data-admin-view="content">Alle Bereiche →</button>')+
        '<div class="admin-module-grid">'+modules.map(m=>'<button type="button" class="admin-module-card" data-admin-go="'+m[2]+'"><span class="admin-module-icon">'+m[3]+'</span><div><small>'+esc(m[4])+'</small><h3>'+esc(m[0])+'</h3><p>'+esc(m[1])+'</p></div><b>↗</b></button>').join('')+'</div>'+
      '</section>'+
      '<section class="admin-glass admin-queue">'+panelHead('PRÜFUNG','Lokale Einreichungen','<button type="button" data-admin-view="moderation">Prüfbereich →</button>')+
        (queue.length?'<div class="admin-queue-list">'+queue.map((x,i)=>'<article><span class="queue-index">'+String(i+1).padStart(2,'0')+'</span><div><small>'+esc(x.type||'Einreichung')+' · '+esc(fmt(x.created))+'</small><h3>'+esc(x.title||'Ohne Titel')+'</h3><p>'+esc(x.status||'lokal')+'</p></div>'+badge('LOKAL','neutral')+'</article>').join('')+'</div>':'<div class="admin-empty"><span>✓</span><b>Keine lokalen Einreichungen</b><p>Die Browser-Prüfqueue ist aktuell leer.</p></div>')+
      '</section>'+
      '<section class="admin-glass admin-capabilities">'+panelHead('BACKEND','Sicherheitsstatus')+
        '<div class="admin-cap-list"><span><i class="ok"></i><b>Supabase Auth</b><em>'+(authState().session?.user?'Sitzung aktiv':'keine Sitzung')+'</em></span><span><i class="ok"></i><b>Eigene Rolle lesen</b><em>user_roles</em></span><span><i class="off"></i><b>Globale Rollen ändern</b><em>noch nicht angebunden</em></span><span><i class="off"></i><b>Moderations-RPC</b><em>noch nicht angebunden</em></span><span><i class="off"></i><b>Server-Audit-Log</b><em>noch nicht angebunden</em></span></div>'+
      '</section>'+
    '</div>'+
  '</div>';
}
function contentView(){
  const s=localStats();
  const modules=[
    ['Datenbank','Katalog, Filter, Einträge und Detailansichten.',s.catalog+' Einträge','database','▱'],
    ['Karte','Marker, Kategorien, Routen und eigene Fundpunkte.',(s.baseMarkers+s.localMarkers)+' Marker','map','⌖'],
    ['Techwerkbank','Reverse Engineering, Erfindung und Fertigung.','Route aktiv','tech-workbench','⚙'],
    ['Neuigkeiten','Projektmeldungen und Archiv-Updates.',s.news+' Meldungen','news','▤'],
    ['Guides','Wissensartikel und strukturierte Hilfen.','Route aktiv','guides','◫'],
    ['Community','Räume, Beiträge und lokale Community-Daten.',s.posts+' lokale Beiträge','community','♙'],
    ['Einreichungen','Funde, Korrekturen und Hinweise.',s.submissions+' lokal','submissions','⇧'],
    ['Profil','Account, Darstellung und Sicherheitsbereich.','Accountbereich','profile','○']
  ];
  return '<section class="admin-view">'+panelHead('CONTENT MANAGEMENT','Inhalte & Seiten','<button type="button" class="admin-secondary compact" data-admin-go="home">Website-Vorschau ↗</button>')+
    '<div class="admin-editor-layout"><div class="admin-content-list">'+modules.map((m,i)=>'<article class="admin-content-row"><span class="admin-content-no">'+String(i+1).padStart(2,'0')+'</span><span class="admin-content-icon">'+m[4]+'</span><div><small>'+esc(m[2])+'</small><h3>'+esc(m[0])+'</h3><p>'+esc(m[1])+'</p></div><button type="button" data-admin-go="'+m[3]+'">Öffnen ↗</button></article>').join('')+'</div>'+
    '<aside class="admin-inspector"><small>EDITOR-PRINZIP</small><h3>Bearbeiten ohne Code</h3><p>Der vorhandene Katalogeditor ist im Bereich Editor verfügbar: Datensätze auswählen, Felder bearbeiten, Vorschau prüfen und in Supabase speichern. Diese Liste öffnet die bestehenden Website-Bereiche.</p><div class="admin-inspector-preview"><span>01</span><b>Auswählen</b><em>Seite oder Datensatz</em><span>02</span><b>Bearbeiten</b><em>Texte, Bilder, Status</em><span>03</span><b>Prüfen</b><em>Live-Vorschau</em><span>04</span><b>Speichern</b><em>über sichere Backend-Aktion</em></div><div class="admin-safe-note"><b>SAFE MODE</b><p>Der Katalogeditor speichert in Supabase. Andere Bereiche behalten ihre bestehenden lokalen oder dateibasierten Datenwege.</p></div></aside></div>'+
  '</section>';
}
function editorView(){
  const entries=catalog();
  const categories=Array.isArray(globalThis.CATALOG_DATA?.categories)?globalThis.CATALOG_DATA.categories:[];
  if(!editorWorking){
    let selectedId='';
    try{selectedId=sessionStorage.getItem('oha:admin-editor:selected')||''}catch{}
    const selected=entries.find(x=>x.id===selectedId)||entries[0]||null;
    editorWorking=selected?structuredClone(selected):null;
    editorBase=selected?structuredClone(selected):null;
    editorRevision=selected?(globalThis.JMA_CATALOG?.revision?.(selected.id)||1):1;
    editorIsNew=false;
  }
  const selected=editorWorking;
  const cards=entries;
  const categoryName=id=>categories.find(x=>x.id===id)?.label||id||'Ohne Kategorie';
  const imageOf=item=>item?.image||'assets/branding/once-human-logo.png';
  const editable=allowed('editor');
  return '<section class="admin-view admin-visual-editor">'+
    panelHead('VISUAL CONTENT EDITOR','Inhalte bearbeiten','<div class="admin-editor-head-actions"><span class="admin-editor-mode"><i></i>SUPABASE · ECHTZEIT</span><button type="button" class="admin-secondary compact" data-admin-go="database">Datenbank ansehen ↗</button></div>')+
    '<div class="admin-editor-toolbar">'+
      '<label class="admin-editor-search"><span>⌕</span><input id="adminEditorSearch" type="search" placeholder="Item, Waffe oder Begriff suchen …" autocomplete="off"></label>'+
      '<div class="admin-editor-filters"><button type="button" class="active" data-editor-filter="all">Alle</button>'+categories.map(c=>'<button type="button" data-editor-filter="'+esc(c.id)+'">'+esc(c.label)+'</button>').join('')+'</div>'+
      '<button type="button" class="admin-primary compact admin-editor-add" data-editor-add '+(!editable?'disabled title="Moderator-, Admin- oder Owner-Rolle erforderlich"':'')+'>＋ Neues Item</button>'+
    '</div>'+
    '<div class="admin-visual-editor-shell '+(selected?'drawer-open':'')+'">'+
      '<div class="admin-editor-canvas">'+
        '<div class="admin-editor-canvas-head"><div><small>LIVE-BESTAND</small><h3>Archivkarten</h3><p>Einträge aus Supabase auswählen, prüfen und dauerhaft speichern.</p></div><span><b>'+cards.length+'</b><small>von '+entries.length+' geladen</small></span></div>'+
        '<div class="admin-editor-card-grid" id="adminEditorGrid">'+cards.map(item=>{
          const search=[item.id,item.name_de,item.kind,item.description,item.acquisition,item.status,(item.tags||[]).join(' ')].join(' ').toLowerCase();
          return '<button type="button" class="admin-editor-card '+(!editorIsNew&&selected?.id===item.id?'selected':'')+'" data-admin-edit-item="'+esc(item.id)+'" data-editor-card data-category="'+esc(item.category||'')+'" data-search="'+esc(search)+'">'+
            '<span class="admin-editor-card-media"><img src="'+esc(imageOf(item))+'" data-editor-catalog-image="'+esc(item.id)+'" alt=""><i>'+esc(categoryName(item.category))+'</i></span>'+
            '<span class="admin-editor-card-copy"><small>'+esc(item.kind||categoryName(item.category))+'</small><strong>'+esc(item.name_de||item.id)+'</strong><em>'+esc(String(item.description||'Keine Beschreibung').slice(0,92))+'</em></span>'+
            '<span class="admin-editor-card-open">BEARBEITEN ↗</span>'+
          '</button>';
        }).join('')+'</div>'+
        '<div class="admin-editor-empty-filter" id="adminEditorEmpty" hidden><span>⌕</span><b>Keine Treffer</b><p>Suchbegriff oder Filter ändern.</p></div>'+
      '</div>'+
      (selected?'<aside class="admin-editor-drawer" aria-label="'+(editorIsNew?'Neuen Katalogeintrag anlegen':'Item bearbeiten')+'">'+
        '<header class="admin-editor-drawer-head"><div><small>'+(editorIsNew?'NEUER KATALOGEINTRAG':'ITEM BEARBEITEN')+'</small><h3 data-editor-drawer-title>'+esc(selected.name_de||'Neues Item')+'</h3></div></header>'+
        '<div class="admin-editor-item-preview"><div class="admin-editor-preview-media"><img src="'+esc(imageOf(selected))+'" alt="" data-editor-preview-image data-editor-catalog-image="'+esc(selected.id)+'"></div><div><small data-editor-preview-category>'+esc(categoryName(selected.category))+'</small><strong data-editor-preview-title>'+esc(selected.name_de||'Ohne Namen')+'</strong><p data-editor-preview-desc>'+esc(selected.description||'Keine Beschreibung')+'</p></div></div>'+
        '<form class="admin-editor-form" data-editor-form onsubmit="return false">'+
          '<label><span>Name *</span><input type="text" value="'+esc(selected.name_de||'')+'" data-editor-input="name" required maxlength="200"></label>'+
          '<label><span>Typ</span><input type="text" value="'+esc(selected.kind||'')+'" data-editor-input="kind" maxlength="500"></label>'+
          '<label class="wide"><span>Beschreibung</span><textarea rows="5" data-editor-input="description" maxlength="5000">'+esc(selected.description||'')+'</textarea></label>'+
          '<label class="wide"><span>Fundort / Freischaltung</span><textarea rows="3" data-editor-input="acquisition" maxlength="5000">'+esc(selected.acquisition||'')+'</textarea></label>'+
          '<label><span>Status</span><input type="text" value="'+esc(selected.status||'')+'" data-editor-input="status" maxlength="500"></label>'+
          '<label><span>Kategorie *</span><select data-editor-category required>'+categories.map(c=>'<option value="'+esc(c.id)+'" '+(selected.category===c.id?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select></label>'+
          '<label class="wide"><span>Tags</span><input type="text" value="'+esc((selected.tags||[]).join(', '))+'" data-editor-input="tags" maxlength="4096"></label>'+
        '</form>'+
        '<section class="admin-editor-media-control"><div><small data-editor-media-kind>BILD</small><b data-editor-media-path>'+esc(selected.image||'Kein Bildpfad · Kategorie-Fallback')+'</b></div><button type="button" data-editor-image '+(!editable?'disabled':'')+'>Bildpfad ändern</button></section>'+
        '<div class="admin-safe-note" role="status" data-editor-status><b>SUPABASE · GESICHERT</b><p>Änderungen werden mit deiner Moderator-, Admin- oder Owner-Rolle in den gemeinsamen Katalog geschrieben. Ohne Originalbild bleibt der vorhandene Fallback erhalten.</p></div>'+
        '<div class="admin-editor-drawer-actions"><button type="button" class="admin-primary" data-editor-save '+(!editable?'disabled title="Moderator-, Admin- oder Owner-Rolle erforderlich"':'')+'>'+(editorIsNew?'Eintrag anlegen':'Änderungen speichern')+'</button></div>'+
      '</aside>':'')+
    '</div>';
}
function mapView(){
  const s=localStats(),custom=list('jma_custom_markers').slice(0,6);
  return '<section class="admin-view">'+panelHead('MAP CONTROL','Karte & Marker','<button type="button" class="admin-primary compact" data-admin-go="map">Live-Karte öffnen →</button>')+
    '<div class="admin-map-layout"><article class="admin-map-preview"><div class="admin-map-image"><img src="./assets/map/once-human-world-map.webp" alt=""><span class="map-pulse p1"></span><span class="map-pulse p2"></span><span class="map-pulse p3"></span></div><div class="admin-map-stats"><span><b>'+s.scenarios+'</b><small>Szenarien</small></span><span><b>'+s.baseMarkers+'</b><small>Basis-Marker</small></span><span><b>'+s.localMarkers+'</b><small>lokale Marker</small></span><span><b>'+s.routes+'</b><small>eigene Routen</small></span></div></article>'+
    '<aside class="admin-glass">'+panelHead('LOKAL','Eigene Marker')+(custom.length?'<div class="admin-simple-list">'+custom.map(x=>'<span><i>⌖</i><div><b>'+esc(x.name||'Marker')+'</b><small>'+esc(x.category||x.scenario||'lokal')+'</small></div></span>').join('')+'</div>':'<div class="admin-empty small"><span>⌖</span><b>Keine lokalen Marker</b><p>Eigene Marker erscheinen nach dem Anlegen hier.</p></div>')+'<div class="admin-safe-note"><b>NÄCHSTER AUSBAU</b><p>Marker anklicken → Eigenschaften rechts bearbeiten → serverseitig freigeben.</p></div></aside></div>'+
  '</section>';
}
function moderationView(){
  const rows=list('jma_submissions');
  return '<section class="admin-view">'+panelHead('MODERATION','Prüfqueue','<button type="button" class="admin-secondary compact" data-admin-go="submissions">Einreichungsseite ↗</button>')+
    '<div class="admin-glass admin-table-wrap"><div class="admin-table-head"><span>ID</span><span>Typ</span><span>Titel</span><span>Status</span><span>Zeit</span><span>Aktion</span></div>'+
    (rows.length?rows.map((x,i)=>'<div class="admin-table-row"><span>#'+String(i+1).padStart(3,'0')+'</span><span>'+esc(x.type||'—')+'</span><span><b>'+esc(x.title||'Ohne Titel')+'</b><small>'+esc(String(x.body||'').slice(0,70))+'</small></span><span>'+badge(x.status||'lokal','neutral')+'</span><span>'+esc(fmt(x.created))+'</span><span><button type="button" data-admin-go="submissions">Öffnen</button></span></div>').join(''):'<div class="admin-empty"><span>✓</span><b>Queue leer</b><p>Keine lokalen Einreichungen vorhanden.</p></div>')+
    '</div><div class="admin-warning"><span>!</span><div><b>Live-Moderation bewusst deaktiviert</b><p>Genehmigen, Ablehnen, Sperren oder globale Meldungen werden erst aktiviert, wenn die serverseitigen Moderationsfunktionen und RLS/RPC-Regeln vorhanden sind.</p></div></div>'+
  '</section>';
}
function usersView(){
  const a=account();
  return '<section class="admin-view">'+panelHead('IDENTITY & ACCESS','Nutzer & Rollen')+
    '<div class="admin-users-layout"><section class="admin-glass">'+panelHead('AKTUELLE IDENTITÄT','Angemeldetes Konto')+
      '<div class="admin-user-card"><span class="admin-user-avatar">'+esc((a?.name||a?.email||'A').slice(0,1).toUpperCase())+'</span><div><small>'+esc(a?.email||'—')+'</small><h3>'+esc(a?.name||'Meta-Human')+'</h3><p>ID: '+esc(a?.id||'—')+'</p></div>'+badge(role()||'keine rolle',role()==='owner'?'owner':'admin')+'</div>'+
      '<div class="admin-warning subtle"><span>i</span><div><b>Nur das eigene Konto ist lesbar</b><p>Die aktuelle Auth-Schicht lädt aus <code>profiles</code> und <code>user_roles</code> ausschließlich die angemeldete Nutzer-ID. Deshalb erfindet dieses Panel keine globale Nutzerliste.</p></div></div>'+
    '</section><aside class="admin-glass">'+panelHead('BERECHTIGUNGEN','Rollenmodell')+
      '<div class="admin-role-matrix"><span><b>User</b><em>Website & persönliche Bereiche</em></span><span><b>Moderator</b><em>Prüfung & Moderationsoberfläche</em></span><span><b>Admin</b><em>Verwaltung & Systembereiche</em></span><span class="owner"><b>Owner</b><em>alle vorhandenen Adminbereiche</em></span></div><button class="admin-disabled-action" type="button" disabled>Rollenverwaltung benötigt sicheren Backend-Endpunkt</button></aside></div>'+
  '</section>';
}
function auditView(){
  const events=[];
  list('jma_submissions').forEach(x=>events.push({time:x.created,type:'Einreichung',title:x.title||'Ohne Titel',detail:x.status||'lokal'}));
  list('jma_community_posts').forEach(x=>events.push({time:x.created,type:'Community',title:String(x.text||'Beitrag').slice(0,48),detail:x.room||'lokal'}));
  events.sort((a,b)=>String(b.time||'').localeCompare(String(a.time||'')));
  return '<section class="admin-view">'+panelHead('TRACE','Audit & Aktivität')+
    '<div class="admin-warning subtle"><span>i</span><div><b>Lokale Aktivität, kein Server-Audit</b><p>Diese Liste zeigt nur Zeitstempel aus vorhandenen Browserdaten. Ein unveränderbares serverseitiges Audit-Log wird nicht simuliert.</p></div></div>'+
    '<div class="admin-glass admin-audit-list">'+(events.length?events.slice(0,16).map(e=>'<article><time>'+esc(fmt(e.time))+'</time><span class="audit-dot"></span><div><small>'+esc(e.type)+'</small><b>'+esc(e.title)+'</b><p>'+esc(e.detail)+'</p></div></article>').join(''):'<div class="admin-empty"><span>≡</span><b>Noch keine lokale Aktivität</b><p>Es sind keine verwertbaren Zeitstempel im Browserzustand vorhanden.</p></div>')+'</div>'+
  '</section>';
}
function systemView(){
  const state=authState();
  const facts=[
    ['Supabase Session',state.session?.user?'verbunden':'nicht verbunden',!!state.session?.user],
    ['Profilquelle','profiles',true],
    ['Rollenquelle','user_roles',true],
    ['Eigene Rolle',role()||'keine',!!role()],
    ['Globale Rollenmutation','nicht angebunden',false],
    ['Moderations-RPC','nicht angebunden',false],
    ['Server-Audit','nicht angebunden',false],
    ['Katalog-Speicherweg','catalog_entries',true]
  ];
  return '<section class="admin-view">'+panelHead('SYSTEM','System & Sicherheit')+
    '<div class="admin-system-grid"><section class="admin-glass">'+panelHead('VERBINDUNGEN','Aktueller Integrationsstand')+'<div class="admin-system-list">'+facts.map(x=>'<span><i class="'+(x[2]?'ok':'off')+'"></i><b>'+esc(x[0])+'</b><em>'+esc(x[1])+'</em></span>').join('')+'</div></section>'+
    '<aside class="admin-glass admin-security-card"><span class="security-ring"><i></i><b>SAFE</b></span><small>ADMIN PREVIEW</small><h3>Keine Scheinberechtigungen</h3><p>Katalogänderungen werden über Supabase und die vorhandenen RLS-Policies gespeichert. Globale Rollen-, Sperr- und Moderationsaktionen bleiben deaktiviert.</p><button type="button" class="admin-secondary" data-admin-go="profile">Profil & Sicherheit →</button></aside></div>'+
  '</section>';
}
function renderView(){
  const view=getView();
  if(!allowed(view)) setView('overview');
  const active=getView();
  if(active==='content') return contentView();
  if(active==='editor') return editorView();
  if(active==='assets') return globalThis.ASSET_LIBRARY.render();
  if(active==='map') return mapView();
  if(active==='moderation') return moderationView();
  if(active==='users') return usersView();
  if(active==='audit') return auditView();
  if(active==='system') return systemView();
  return overview();
}
function renderAdmin(){
  if(!ADMIN_ROLES.has(role())) return accessScreen();
  return shell(renderView());
}


function bindLiquidNav(){
  const items=document.querySelectorAll('.admin-nav-item:not(:disabled)');
  items.forEach(item=>{
    let frame=0;
    const reset=()=>{
      cancelAnimationFrame(frame);
      item.style.setProperty('--nav-x','50%');
      item.style.setProperty('--nav-y','50%');
      item.style.setProperty('--nav-rx','0deg');
      item.style.setProperty('--nav-ry','0deg');
    };
    item.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch') return;
      const rect=item.getBoundingClientRect();
      const x=Math.max(0,Math.min(rect.width,event.clientX-rect.left));
      const y=Math.max(0,Math.min(rect.height,event.clientY-rect.top));
      const px=(x/rect.width)*100;
      const py=(y/rect.height)*100;
      const ry=((x/rect.width)-.5)*4.5;
      const rx=((y/rect.height)-.5)*-3.5;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        item.style.setProperty('--nav-x',px.toFixed(2)+'%');
        item.style.setProperty('--nav-y',py.toFixed(2)+'%');
        item.style.setProperty('--nav-rx',rx.toFixed(2)+'deg');
        item.style.setProperty('--nav-ry',ry.toFixed(2)+'deg');
      });
    });
    item.addEventListener('pointerleave',reset);
    item.addEventListener('pointercancel',reset);
  });
}

function bindLiquidCards(){
  const cards=document.querySelectorAll('.admin-system-list>span,.admin-cap-list>span');
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
      if(event.pointerType==='touch') return;
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

function bindAdmin(){
  document.querySelectorAll('.admin-editor-card-media img,[data-editor-preview-image]').forEach(image=>{
    const fallback='assets/branding/once-human-logo.png';
    const useFallback=()=>{if(image.getAttribute('src')!==fallback) image.src=fallback};
    image.addEventListener('error',useFallback);
    if(image.complete&&image.naturalWidth===0) useFallback();
  });
  document.querySelectorAll('[data-admin-view]').forEach(button=>button.addEventListener('click',()=>{
    const view=button.dataset.adminView;
    if(!allowed(view)) return;
    setView(view);
    if(view!=='editor'){editorWorking=null;editorBase=null;editorIsNew=false}
    globalThis.JMA_RENDER?.();
  }));
  document.querySelectorAll('[data-admin-go]').forEach(button=>button.addEventListener('click',()=>{
    location.hash='#/'+button.dataset.adminGo;
  }));
  const status=(message,error=false)=>{
    const target=document.querySelector('[data-editor-status]');
    if(!target)return;
    target.querySelector('b').textContent=error?'NICHT GESPEICHERT':'SUPABASE · GESICHERT';
    target.querySelector('p').textContent=message;
  };
  const readForm=()=>{
    const form=document.querySelector('[data-editor-form]');
    if(!form||!editorWorking)return null;
    const value=structuredClone(editorWorking);
    value.name_de=form.querySelector('[data-editor-input="name"]').value.trim();
    value.kind=form.querySelector('[data-editor-input="kind"]').value.trim();
    value.description=form.querySelector('[data-editor-input="description"]').value.trim();
    value.acquisition=form.querySelector('[data-editor-input="acquisition"]').value.trim();
    value.status=form.querySelector('[data-editor-input="status"]').value.trim();
    value.category=form.querySelector('[data-editor-category]').value;
    value.tags=form.querySelector('[data-editor-input="tags"]').value.split(',').map(tag=>tag.trim()).filter(Boolean);
    return value;
  };
  const updatePreview=()=>{
    const value=readForm();if(!value)return;
    editorWorking=value;
    const name=value.name_de||'Ohne Namen';
    const set=(selector,text)=>{const el=document.querySelector(selector);if(el)el.textContent=text};
    set('[data-editor-drawer-title]',name);
    set('[data-editor-preview-title]',name);
    set('[data-editor-preview-desc]',value.description||'Keine Beschreibung');
    const categories=globalThis.CATALOG_DATA?.categories||[];
    set('[data-editor-preview-category]',categories.find(x=>x.id===value.category)?.label||value.category);
    if(mediaEntryId!==value.id||mediaCategory!==value.category)refreshEditorMedia();
    else if(!mediaAsset)set('[data-editor-media-path]',value.image||'Kein Bildpfad · Kategorie-Fallback');
    const card=editorIsNew?null:document.querySelector('[data-admin-edit-item="'+CSS.escape(value.id)+'"]');
    const strong=card?.querySelector('.admin-editor-card-copy strong');
    if(strong)strong.textContent=name;
    const desc=card?.querySelector('.admin-editor-card-copy em');
    if(desc)desc.textContent=(value.description||'Keine Beschreibung').slice(0,92);
    if(card)card.dataset.search=[value.id,value.name_de,value.kind,value.description,value.acquisition,value.status,...value.tags].join(' ').toLowerCase();
  };
  document.querySelectorAll('[data-editor-input],[data-editor-category]').forEach(input=>input.addEventListener('input',updatePreview));
  document.querySelectorAll('[data-editor-category]').forEach(input=>input.addEventListener('change',updatePreview));
  const imageButton=document.querySelector('[data-editor-image]');
  let mediaAsset=null,mediaEntryId='',mediaCategory='',mediaTicket=0;
  async function hydrateEditorImages(images=document.querySelectorAll('[data-editor-catalog-image]')){
    for(const image of images){
      const id=image.dataset.editorCatalogImage,entry=editorWorking?.id===id?structuredClone(editorWorking):catalog().find(row=>row.id===id);
      const ticket=image.catalogImageTicket=(image.catalogImageTicket||0)+1;
      try{
        const resolved=await globalThis.JMA_ASSET_STORE.catalogImage(entry);
        if(resolved&&image.isConnected&&image.dataset.editorCatalogImage===id&&image.catalogImageTicket===ticket){image.src=resolved.url;image.dataset.catalogCentral=resolved.assetId}
      }catch{/* Existing editor fallback remains visible. */}
    }
  }
  async function refreshEditorMedia(){
    if(!imageButton||!editorWorking)return;
    const entry=structuredClone(editorWorking),ticket=++mediaTicket;
    mediaEntryId=entry.id;mediaCategory=entry.category;mediaAsset=null;
    imageButton.disabled=true;imageButton.textContent='Bildzuordnung prüfen …';
    try{
      const asset=await globalThis.JMA_ASSET_STORE.catalogAsset(entry);
      if(!imageButton.isConnected||ticket!==mediaTicket||editorWorking?.id!==entry.id)return;
      mediaAsset=asset;
      const label=document.querySelector('[data-editor-media-path]'),kind=document.querySelector('[data-editor-media-kind]');
      kind.textContent=asset?'BILD · ZENTRALE ASSET-BIBLIOTHEK':'BILD · LEGACY-FALLBACK';
      label.textContent=asset?asset.id+' · '+(globalThis.ASSET_LIBRARY_MODEL.statuses[asset.status]||asset.status):entry.image||'Kein Bildpfad · Kategorie-Fallback';
      label.title='Legacy-Fallback bleibt erhalten: '+(entry.image||'Kategorie-Fallback');
      imageButton.textContent=asset?'Asset-Bibliothek öffnen':'Bildpfad ändern';
      imageButton.disabled=!allowed(asset?'assets':'editor');
    }catch{
      if(imageButton.isConnected&&ticket===mediaTicket){imageButton.textContent='Bildzuordnung nicht erreichbar';imageButton.disabled=true}
    }
  }
  imageButton?.addEventListener('click',async()=>{
    const entry=readForm();if(!entry)return;
    imageButton.disabled=true;
    try{
      // Recheck the central relationship before offering a legacy-only path edit.
      const asset=await globalThis.JMA_ASSET_STORE.catalogAsset(entry);
      if(!imageButton.isConnected||editorWorking?.id!==entry.id)return;
      if(asset){
        if(!discardDraft()||!globalThis.ASSET_LIBRARY.select(asset.id))return;
        setView('assets');editorWorking=editorBase=null;editorIsNew=false;globalThis.JMA_RENDER?.();return;
      }
      const answer=window.prompt('Relativer Bildpfad unter assets/ (neue Originale unter assets/items/; leer = Kategorie-Fallback):',entry.image||'');
      if(answer===null)return;
      editorWorking.image=answer.trim()||null;
      const preview=document.querySelector('[data-editor-preview-image]');
      if(preview)preview.src=editorWorking.image?'./'+editorWorking.image:'./assets/branding/once-human-logo.png';
      document.querySelectorAll('[data-admin-edit-item="'+CSS.escape(editorWorking.id||'')+'"] .admin-editor-card-media img').forEach(image=>image.src=editorWorking.image?'./'+editorWorking.image:'./assets/branding/once-human-logo.png');
      updatePreview();
    }catch(error){status(error?.message||'Asset-Zuordnung konnte nicht geladen werden.',true)}
    finally{if(imageButton.isConnected)refreshEditorMedia()}
  });
  const discardDraft=()=>{
    const current=readForm();
    const dirty=editorIsNew?Boolean(current&&(current.name_de||current.kind||current.description||current.acquisition||current.status||current.tags.length||current.image)):
      Boolean(current&&editorBase&&JSON.stringify(current)!==JSON.stringify(editorBase));
    return !dirty||window.confirm('Ungespeicherte Änderungen verwerfen?');
  };
  document.querySelectorAll('[data-admin-edit-item]').forEach(button=>button.addEventListener('click',()=>{
    const itemId=button.dataset.adminEditItem||'';
    if(!discardDraft())return;
    const item=catalog().find(entry=>entry.id===itemId);
    if(!item)return;
    editorWorking=structuredClone(item);editorBase=structuredClone(item);editorIsNew=false;
    editorRevision=globalThis.JMA_CATALOG?.revision?.(item.id)||1;
    try{sessionStorage.setItem('oha:admin-editor:selected',itemId)}catch{}
    document.querySelectorAll('[data-admin-edit-item]').forEach(card=>card.classList.toggle('selected',card===button));
    const categories=globalThis.CATALOG_DATA?.categories||[];
    const categoryName=categories.find(x=>x.id===item.category)?.label||item.category;
    const setText=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
    const setValue=(selector,value)=>{const el=document.querySelector(selector);if(el)el.value=value};
    setText('[data-editor-drawer-title]',item.name_de||item.id);
    setText('[data-editor-preview-category]',categoryName);
    setText('[data-editor-preview-title]',item.name_de||item.id);
    setText('[data-editor-preview-desc]',item.description||'Keine Beschreibung');
    setText('[data-editor-media-path]',item.image||'Kein Bildpfad · Kategorie-Fallback');
    setValue('[data-editor-input="name"]',item.name_de||'');
    setValue('[data-editor-input="kind"]',item.kind||'');
    setValue('[data-editor-input="description"]',item.description||'');
    setValue('[data-editor-input="acquisition"]',item.acquisition||'');
    setValue('[data-editor-input="status"]',item.status||'');
    setValue('[data-editor-input="tags"]',(item.tags||[]).join(', '));
    setValue('[data-editor-category]',item.category||'');
    const image=document.querySelector('[data-editor-preview-image]');if(image){image.src=item.image?'./'+item.image:'./assets/branding/once-human-logo.png';image.dataset.editorCatalogImage=item.id;delete image.dataset.catalogCentral;hydrateEditorImages([image])}
    refreshEditorMedia();
  }));
  const search=document.querySelector('#adminEditorSearch');
  const filterButtons=[...document.querySelectorAll('[data-editor-filter]')];
  const cards=[...document.querySelectorAll('[data-editor-card]')];
  const empty=document.querySelector('#adminEditorEmpty');
  let activeFilter='all';
  const applyEditorFilter=()=>{
    const query=String(search?.value||'').trim().toLowerCase();let visible=0;
    cards.forEach(card=>{
      const show=(activeFilter==='all'||card.dataset.category===activeFilter)&&(!query||(card.dataset.search||'').includes(query));
      card.hidden=!show;if(show)visible++;
    });
    if(empty)empty.hidden=visible!==0;
  };
  search?.addEventListener('input',applyEditorFilter);
  filterButtons.forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.editorFilter||'all';filterButtons.forEach(item=>item.classList.toggle('active',item===button));applyEditorFilter();
  }));
  document.querySelector('[data-editor-add]')?.addEventListener('click',()=>{
    if(!discardDraft())return;
    const categories=globalThis.CATALOG_DATA?.categories||[];
    if(!categories.length){status('Es sind keine Katalogkategorien geladen.',true);return}
    editorWorking={id:'',category:categories[0].id,name_de:'',kind:'',description:'',acquisition:'',status:'Wird geprüft',tags:[],image:null,sources:[]};
    editorBase=null;editorRevision=0;editorIsNew=true;
    globalThis.JMA_RENDER?.();
  });
  document.querySelector('[data-editor-save]')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    const form=document.querySelector('[data-editor-form]');
    if(!form?.reportValidity())return;
    const entry=readForm();
    if(!entry)return;
    if(editorIsNew){
      const normalized=entry.name_de.normalize('NFKC').toLocaleLowerCase('de-DE');
      const duplicate=catalog().find(item=>item.category===entry.category&&item.name_de.normalize('NFKC').toLocaleLowerCase('de-DE')===normalized);
      if(duplicate){status('Ein gleichnamiger Eintrag ist in dieser Kategorie bereits vorhanden ('+duplicate.id+'). Lade ihn stattdessen zum Bearbeiten.',true);return}
      const slug=normalized.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,95)||'eintrag';
      const prefix='cat-'+slug;
      const ids=new Set(catalog().map(item=>item.id));let id=prefix,suffix=2;
      while(ids.has(id))id=prefix+'-'+suffix++;
      entry.id=id;
    }
    try{
      if(entry.image && entry.image!==(editorBase?.image||null)){
        if(!/^assets\/items\/.+\.(png|webp|jpg|jpeg)$/i.test(entry.image)||entry.image.includes('..')||entry.image.includes('\\'))throw new Error('Neue Originalbilder müssen unter assets/items/ liegen. Ohne Bild den Pfad leeren, um den Kategorie-Fallback zu verwenden.');
        const image=new Image();image.src='./'+entry.image;
        try{await image.decode()}catch{throw new Error('Das Bild ist nicht erreichbar oder beschädigt. Pfad prüfen oder leeren, um den Kategorie-Fallback zu verwenden.')}
      }
      button.disabled=true;
      const saved=editorIsNew?await globalThis.JMA_CATALOG.create(entry):await globalThis.JMA_CATALOG.update(entry,editorRevision);
      editorWorking=structuredClone(saved.entry);editorBase=structuredClone(saved.entry);editorRevision=saved.revision;editorIsNew=false;
      try{sessionStorage.setItem('oha:admin-editor:selected',saved.id)}catch{}
      globalThis.JMA_RENDER?.();
      status('Eintrag '+saved.id+' wurde in Supabase gespeichert.');
    }catch(error){
      status(error?.message||'Katalogänderung konnte nicht gespeichert werden.',true);
    }finally{button.disabled=false}
  });
  refreshEditorMedia();hydrateEditorImages();
  bindLiquidCards();
  bindLiquidNav();
  if(getView()==='assets')globalThis.ASSET_LIBRARY.bind();
}

globalThis.ADMIN_PANEL={render:renderAdmin,bind:bindAdmin,allowed:()=>ADMIN_ROLES.has(role())};
globalThis.FULL_ROUTE_RENDERERS=globalThis.FULL_ROUTE_RENDERERS||{};
globalThis.FULL_ROUTE_BINDERS=globalThis.FULL_ROUTE_BINDERS||{};
globalThis.FULL_ROUTE_RENDERERS.admin=renderAdmin;
globalThis.FULL_ROUTE_BINDERS.admin=bindAdmin;
})();
