const ROUTES = [
  ['home','Start','⌂','Öffentlicher Einstieg in das Once-Human-Archiv'],
  ['dashboard','Kommandozentrale','◈','Persönlicher Überblick und Fortschritt'],
  ['news','Neuigkeiten','▤','Updates, Events und Archivmeldungen'],
  ['database','Datenbank','▱','Zentraler Katalog mit Suche, Filtern und Details'],
  ['map','Karte','⌖','Interaktive Karte, Marker, Filter und Routen'],
  ['hunt','Jagdliste','◎','Persönliche Ziele und Prioritäten'],
  ['routes','Farmrouten','↝','Gespeicherte Fund- und Farmrouten'],
  ['planner','Einsatzplaner','◷','Session- und Einsatzplanung'],
  ['guides','Guides','◫','Strukturierte Guides und Wissensartikel'],
  ['patchwatch','Patch-Wächter','◴','Änderungen und Datenqualität'],
  ['secrets','Kaninchenbau','◇','Geheimnisse, Easter Eggs und Untersuchungen'],
  ['builds','Builds','⚒','Build-Planer, Slots, Werte, Speichern und Laden'],
  ['community','Community','♙','Fragen, Wissen und Community-Austausch'],
  ['submissions','Einreichungen','⇧','Funde, Korrekturen und Moderationsabläufe'],
  ['profile','Profil & Sicherheit','○','Profil, Fortschritt, Sicherheit und 2FA'],
  ['weapon-blueprints','Waffen-Baupläne','⌁','Waffen-Baupläne und zugehörige Daten'],
  ['armor-blueprints','Rüstungs-Baupläne','⬡','Rüstungs-Baupläne und Sets'],
  ['armor-materials','Rüstungsmaterialien','▧','Materialien für Rüstung und Herstellung'],
  ['deviations','Abweichler','✧','Abweichler-Katalog und Details'],
  ['mods','Mods','✦','Mod-Katalog, Fundorte und Eigenschaften'],
  ['compare-weapons','Waffenvergleich','⇄','Waffenwerte nebeneinander vergleichen'],
  ['compare-armors','Rüstungsvergleich','⇆','Rüstungswerte nebeneinander vergleichen'],
  ['memetics','Memetik','⌘','Memetik, Freischaltungen und Fortschritt'],
  ['vehicles','Fahrzeuge','◉','Fahrzeuge, Teile und Informationen'],
  ['creatures','Kreaturen','♢','Kreaturen und relevante Archivdaten'],
  ['tech-workbench','Techwerkbank','⚙','Reverse Engineering, Erfindung und Fertigung'],
  ['exchange','Community-Werkstatt','∞','Community-Builds sowie Suche & Biete']
].map((r,i)=>({id:r[0],label:r[1],icon:r[2],purpose:r[3],order:i+1}));

const $ = s => document.querySelector(s);
const app = $('#app');
const mainNav = $('#mainNav');
let authMode = 'login';

const NAV = [
  ['home','Start','⌂'],['database','Datenbank','▱'],['map','Karte','⌖'],['builds','Builds','⚒'],['tech-workbench','Techwerkbank','⚙'],['community','Community','♙'],['guides','Guides','◫']
];
const AUTH_REQUIRED_ROUTES = new Set(['database','map','live-map','builds','tech-workbench','community','guides','dashboard','profile','settings','admin','hunt','routes','planner','submissions','exchange']);
mainNav.innerHTML = NAV.map(([id,label,icon])=>`<a href="#/${id}" data-nav="${id}"><span>${SITE_HEADER.icon(id)}</span>${label}</a>`).join('');

function homeBrandText(value=''){
  return String(value)
    .replace(/JazzeMeow\s+Archive/gi,'Once Human Archiv')
    .replace(/JazzeMeow\s+Archiv/gi,'Once Human Archiv')
    .replace(/JazzeMeow/gi,'Once Human');
}

function asset(name){ return `./assets/reference/${name}`; }
function quick(route,title,desc,img,icon,gated=false){return `<a class="landing-quick" href="#/${route}"${gated?' data-showcase-gated':''} style="--quick-image:url('${asset(img)}')"><span class="landing-quick-visual"></span>${gated?'<em class="showcase-access">⌁ ARCHIVZUGANG</em>':''}<span class="landing-quick-body"><i>${icon}</i><span><h3>${title}</h3><p>${desc}</p></span><b aria-hidden="true">›</b></span></a>`}

const DB_STATE={q:'',category:'all',status:'all',sort:'name',view:'grid',onlyFav:false,page:1};
function catalogEntries(){return Array.isArray(globalThis.CATALOG_DATA?.entries)?globalThis.CATALOG_DATA.entries:[]}
function catalogCategories(){return Array.isArray(globalThis.CATALOG_DATA?.categories)?globalThis.CATALOG_DATA.categories:[]}
function categoryFor(id){return catalogCategories().find(c=>c.id===id)||{id,label:id||'Unbekannt',icon:'◇',subcategories:[]}}
function storedSet(key){const value=globalThis.JMA_STORE.read(key,[]);return new Set(Array.isArray(value)?value:[])}

function writeSet(key,set){globalThis.JMA_STORE.write(key,[...set])}

function filteredCatalog(){const q=DB_STATE.q.trim().toLowerCase(),fav=storedSet('jma_favorites');return catalogEntries().filter(e=>(!q||[e.id,e.name_de,e.kind,e.description,e.acquisition,...(e.tags||[])].join(' ').toLowerCase().includes(q))&&(DB_STATE.category==='all'||e.category===DB_STATE.category)&&(DB_STATE.status==='all'||e.status===DB_STATE.status)&&(!DB_STATE.onlyFav||fav.has(e.id))).sort((a,b)=>DB_STATE.sort==='category'?categoryFor(a.category).label.localeCompare(categoryFor(b.category).label,'de')||a.name_de.localeCompare(b.name_de,'de'):DB_STATE.sort==='checked'?String(b.last_checked||'').localeCompare(a.last_checked||''):a.name_de.localeCompare(b.name_de,'de'))}

function catalogArt(e,fallback){const valid=typeof e.image==='string'&&/^assets\/items\/.+\.(png|webp|jpg|jpeg)$/i.test(e.image)&&!e.image.includes('..')&&!e.image.includes('\\');return valid?`<img src="./${e.image.split('/').map(encodeURIComponent).join('/')}" alt="${escapeHtml(e.name_de)}" loading="lazy">`:fallback}
function catalogCard(e){
  const category=categoryFor(e.category),esc=escapeHtml,found=storedSet('jma_found').has(e.id);
  return `<article class="catalog-card" data-entry="${esc(e.id)}">
    <button class="catalog-card-art" type="button" data-db-detail="${esc(e.id)}" aria-label="Details zu ${esc(e.name_de)}"><code>${esc(e.id)}</code>${catalogArt(e,`<span class="catalog-glyph" aria-hidden="true">${esc(category.icon||'◇')}</span><small>ORIGINALBILD AUSSTEHEND</small>`)}${found?'<span class="catalog-found-mark">✓ GEFUNDEN</span>':''}</button>
    <div class="catalog-card-copy"><small class="catalog-category">${esc(category.label)}</small><h3><button type="button" data-db-detail="${esc(e.id)}">${esc(e.name_de)}</button></h3><p class="catalog-kind">${esc(e.kind||'Archiv-Eintrag')}</p><p class="catalog-excerpt">${esc(e.description||e.acquisition||'Beschreibung noch nicht abschließend dokumentiert.')}</p><div class="catalog-tags">${(e.tags||[]).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
    <footer class="catalog-card-footer"><span class="catalog-status"><i aria-hidden="true"></i>${esc(e.status||'Prüfstatus offen')}</span><div class="catalog-actions"><button type="button" data-db-detail="${esc(e.id)}">EINTRAG ÖFFNEN <span aria-hidden="true">↗</span></button>${[['fav','jma_favorites','★','Favorit'],['hunt','jma_hunt','◎','Jagdliste'],['found','jma_found','✓','Gefunden']].map(([action,key,icon,label])=>`<button class="icon-action ${storedSet(key).has(e.id)?'active':''}" type="button" data-db-${action}="${esc(e.id)}" aria-label="${label}: ${esc(e.name_de)}" title="${label}" aria-pressed="${storedSet(key).has(e.id)}">${icon}</button>`).join('')}</div></footer>
  </article>`;
}
function renderCatalogGrid(){
  const grid=$('#catalogGrid');if(!grid)return;
  const rows=filteredCatalog(),pages=Math.max(1,Math.ceil(rows.length/12));DB_STATE.page=Math.max(1,Math.min(pages,DB_STATE.page));
  grid.classList.toggle('list',DB_STATE.view==='list');
  const start=(DB_STATE.page-1)*12;
  grid.innerHTML=rows.slice(start,start+12).map(catalogCard).join('')||'<div class="catalog-empty"><span aria-hidden="true">⌕</span><b>KEINE EINTRÄGE GEFUNDEN</b><p>Ändere den Suchbegriff oder setze deine Filter zurück.</p></div>';
  $('#catalogResultCount').textContent=`${rows.length} / ${catalogEntries().length} Einträge`;
  $('#catalogRange').textContent=rows.length?`${String(start+1).padStart(2,'0')}—${String(Math.min(start+12,rows.length)).padStart(2,'0')}`:'00—00';
  const knownIds=new Set(catalogEntries().map(e=>e.id));
  $('#catalogFoundCount').textContent=[...storedSet('jma_found')].filter(id=>knownIds.has(id)).length;
  const activeFilters=Number(DB_STATE.category!=='all')+Number(DB_STATE.status!=='all')+Number(DB_STATE.onlyFav);
  $('#catalogFilterSummary').textContent=activeFilters?`${activeFilters} FILTER AKTIV`:'KATALOG EINGRENZEN';
  $('#catalogPagination').innerHTML=`<button type="button" data-db-page="${DB_STATE.page-1}" ${DB_STATE.page===1?'disabled':''}>← ZURÜCK</button><span>SEITE <b>${String(DB_STATE.page).padStart(2,'0')}</b> / ${String(pages).padStart(2,'0')}</span><button type="button" data-db-page="${DB_STATE.page+1}" ${DB_STATE.page===pages?'disabled':''}>WEITER →</button>`;
  document.querySelectorAll('[data-db-category]').forEach(b=>{const active=b.dataset.dbCategory===DB_STATE.category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  document.querySelectorAll('[data-db-view]').forEach(b=>{const active=b.dataset.dbView===DB_STATE.view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
}
function renderDatabase(){
  const esc=escapeHtml,statuses=[...new Set(catalogEntries().map(e=>e.status).filter(Boolean))];
  return `<section class="database-page">
    <header class="database-hero"><div class="database-hero-copy"><div class="database-kicker"><span></span> ARCHIV / WISSEN & FUNDORTE</div><h1>DATENBANK<span>DER KATALOG DEINER NÄCHSTEN FUNDE.</span></h1><p>Ausrüstung, Ressourcen und Anomalien. Durchsuche das Archiv, prüfe Fundwege und halte deine Sammlung auf Kurs.</p></div><div class="database-hero-index"><small>QUELLSTAND</small><b>${esc(globalThis.CATALOG_DATA?.snapshot||'—')}</b><span>KURATIERTER ARCHIVBESTAND</span></div><div class="database-metrics"><span><b>${catalogEntries().length}</b><small>Einträge im Katalog</small></span><span><b>${catalogCategories().length}</b><small>Archivbereiche</small></span><span><b id="catalogFoundCount">0</b><small>Von dir gefunden</small></span><a href="#/hunt">◎ DEINE JAGDLISTE <span>↗</span></a></div></header>
    <div class="database-shell"><aside class="catalog-rail"><details class="catalog-filters" id="catalogFilters" ${matchMedia('(min-width:900px)').matches?'open':''}><summary><span><small id="catalogFilterSummary">KATALOG EINGRENZEN</small><b>FILTER & BEREICHE</b></span><i aria-hidden="true">⌄</i></summary><div class="catalog-filter-body"><div class="catalog-category-list"><button type="button" data-db-category="all"><span>⌘</span><b>Alle Einträge</b><small>${catalogEntries().length}</small></button>${catalogCategories().map(c=>`<button type="button" data-db-category="${esc(c.id)}"><span>${esc(c.icon||'◇')}</span><b>${esc(c.label)}</b><small>${catalogEntries().filter(e=>e.category===c.id).length}</small></button>`).join('')}</div><div class="catalog-personal-filters"><label class="catalog-field" for="catalogStatus">PRÜFSTATUS<select id="catalogStatus"><option value="all">Alle Prüfstatus</option>${statuses.map(x=>`<option ${DB_STATE.status===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label class="catalog-favorite-filter"><input id="catalogOnlyFav" type="checkbox" ${DB_STATE.onlyFav?'checked':''}><span>★ Nur meine Favoriten</span></label><button id="catalogReset" type="button">↻ FILTER ZURÜCKSETZEN</button></div></div></details><div class="catalog-import-note"><span>◇</span><p>Originalbilder werden ergänzt. Die Einträge zeigen bereits die vorhandenen Archivdaten.</p></div></aside>
      <div class="catalog-main" role="region" aria-label="Katalogergebnisse"><div class="catalog-toolbar"><label class="catalog-search" for="catalogSearch"><span aria-hidden="true">⌕</span><input id="catalogSearch" value="${esc(DB_STATE.q)}" placeholder="Name, Typ, Tag oder Fundweg suchen …" aria-label="Katalog durchsuchen"><small>ARCHIVSUCHE</small></label></div><div class="catalog-list-head"><div class="catalog-result-label" aria-live="polite"><small>DEINE AUSWAHL</small><b id="catalogResultCount"></b></div><div class="catalog-display-controls"><label for="catalogSort"><span>SORTIERUNG</span><select id="catalogSort"><option value="name">Name A–Z</option><option value="category">Kategorie</option><option value="checked">Zuletzt geprüft</option></select></label><div class="catalog-view-control" role="group" aria-label="Darstellung"><button type="button" data-db-view="grid" aria-label="Rasteransicht">▦</button><button type="button" data-db-view="list" aria-label="Listenansicht">☷</button></div></div></div><div class="catalog-grid" id="catalogGrid"></div><div class="catalog-page-footer"><small>ANGEZEIGT <b id="catalogRange"></b> / MAX. 12 PRO SEITE</small><nav id="catalogPagination" class="catalog-pagination" aria-label="Katalogseiten"></nav></div></div>
    </div>
  </section>`;
}

function ensureCatalogDialog(){
  let d=$('#catalogDialog'); if(d)return d;
  d=document.createElement('dialog');d.id='catalogDialog';d.className='catalog-dialog';document.body.appendChild(d);return d;
}
function openCatalogDetail(id){
  const e=catalogEntries().find(x=>x.id===id);if(!e)return;
  const c=categoryFor(e.category),d=ensureCatalogDialog(),esc=escapeHtml;
  d.setAttribute('aria-labelledby','catalogDetailTitle');
  d.innerHTML=`<button class="dialog-close" data-db-close type="button" aria-label="Eintragsdetails schließen">×</button><aside class="catalog-detail-visual"><div class="catalog-detail-index"><small>ARCHIV / EINTRAG</small><code>${esc(e.id)}</code></div><div class="catalog-detail-art">${catalogArt(e,`<span class="catalog-glyph" aria-hidden="true">${esc(c.icon||'◇')}</span><small>ORIGINALBILD AUSSTEHEND</small>`)}</div><div class="catalog-detail-category"><small>ARCHIVBEREICH</small><b>${esc(c.label)}</b></div></aside><div class="catalog-detail-body"><header><div class="database-kicker"><span></span> KATALOG / DETAILANSICHT</div><h2 id="catalogDetailTitle">${esc(e.name_de)}</h2><p class="catalog-kind">${esc(e.kind||'Archiv-Eintrag')}</p><div class="catalog-detail-tags">${(e.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div></header><section><small>01 / BESCHREIBUNG</small><p>${esc(e.description||'Für diesen Eintrag ist noch keine Beschreibung dokumentiert.')}</p></section><section class="catalog-acquisition"><small>02 / FUNDWEG & ERHALT</small><p>${esc(e.acquisition||'Der Fundweg ist noch nicht abschließend dokumentiert.')}</p></section><div class="catalog-detail-meta"><span><small>PRÜFSTATUS</small><b>${esc(e.status||'offen')}</b></span><span><small>ZULETZT GEPRÜFT</small><b>${esc(e.last_checked||'—')}</b></span></div><footer class="actions catalog-detail-actions">${[['fav','jma_favorites','★','FAVORIT'],['hunt','jma_hunt','◎','JAGDLISTE'],['found','jma_found','✓','GEFUNDEN']].map(([action,key,icon,label])=>`<button class="${storedSet(key).has(id)?'selected':''}" data-db-${action}="${esc(id)}" type="button" aria-pressed="${storedSet(key).has(id)}">${icon} ${label} ${storedSet(key).has(id)?'✓':'＋'}</button>`).join('')}</footer></div>`;
  d.querySelector('[data-db-close]').onclick=()=>d.close();
  for(const [action,key,label] of [['fav','jma_favorites','Favorit'],['hunt','jma_hunt','Jagdliste'],['found','jma_found','Gefunden']])d.querySelector(`[data-db-${action}]`).onclick=()=>{toggleCatalogSet(key,id,label);d.close();renderCatalogGrid();openCatalogDetail(id);d.querySelector(`[data-db-${action}]`).focus()};
  d.showModal();
}

function toggleCatalogSet(key,id,label){const s=storedSet(key);const adding=!s.has(id);adding?s.add(id):s.delete(id);writeSet(key,s);toast(`${label}: ${adding?'hinzugefügt':'entfernt'}.`)}
function bindDatabase(){
  $('#catalogSearch')?.addEventListener('input',e=>{DB_STATE.q=e.target.value;DB_STATE.page=1;renderCatalogGrid()});
  $('#catalogStatus')?.addEventListener('change',e=>{DB_STATE.status=e.target.value;DB_STATE.page=1;renderCatalogGrid()});
  $('#catalogReset')?.addEventListener('click',()=>{DB_STATE.q='';DB_STATE.category='all';DB_STATE.status='all';DB_STATE.onlyFav=false;DB_STATE.page=1;render()});
  document.querySelectorAll('[data-db-category]').forEach(b=>b.addEventListener('click',()=>{DB_STATE.category=b.dataset.dbCategory;DB_STATE.page=1;renderCatalogGrid()}));
  $('#catalogGrid')?.addEventListener('click',e=>{const detail=e.target.closest('[data-db-detail]'),fav=e.target.closest('[data-db-fav]'),hunt=e.target.closest('[data-db-hunt]');if(detail)return openCatalogDetail(detail.dataset.dbDetail);if(fav){toggleCatalogSet('jma_favorites',fav.dataset.dbFav,'Favorit');return renderCatalogGrid()}if(hunt){toggleCatalogSet('jma_hunt',hunt.dataset.dbHunt,'Jagdliste');return renderCatalogGrid()}});
  $('#catalogSort').value=DB_STATE.sort;
  $('#catalogSort').onchange=e=>{DB_STATE.sort=e.target.value;DB_STATE.page=1;renderCatalogGrid()};
  $('#catalogOnlyFav').onchange=e=>{DB_STATE.onlyFav=e.target.checked;DB_STATE.page=1;renderCatalogGrid()};
  document.querySelectorAll('[data-db-view]').forEach(b=>b.onclick=()=>{DB_STATE.view=b.dataset.dbView;renderCatalogGrid()});
  $('#catalogPagination').onclick=e=>{const b=e.target.closest('[data-db-page]');if(b){DB_STATE.page=+b.dataset.dbPage;renderCatalogGrid()}};
  $('#catalogGrid').addEventListener('click',e=>{const b=e.target.closest('[data-db-found]');if(b){toggleCatalogSet('jma_found',b.dataset.dbFound,'Gefunden');renderCatalogGrid()}});
  renderCatalogGrid();
  const pending=sessionStorage.getItem('jma_open_catalog');if(pending){sessionStorage.removeItem('jma_open_catalog');setTimeout(()=>openCatalogDetail(pending),20)}
}

function readStoredArray(key){const value=globalThis.JMA_STORE.read(key,[]);return Array.isArray(value)?value:[]}


function renderHome(){
  const account = globalThis.JMA_AUTH?.getAccount?.() || null;
  const guest=!account;
  const gateAttr=guest?' data-showcase-gated':'';
  const gateBadge=guest?'<em class="showcase-access">⌁ ARCHIVZUGANG</em>':'';
  const entries=catalogEntries(), cats=catalogCategories(), archive=globalThis.ARCHIVE_DATA||{}, news=archive.seed?.news||[], builds=archive.seed?.builds||[];
  const featured=news.find(n=>n.featured)||news[0];
  const secondary=news.filter(n=>!featured||n.id!==featured.id).slice(0,3);
  const countCat=id=>entries.filter(e=>e.category===id).length;
  const favorites=storedSet('jma_favorites').size, hunt=storedSet('jma_hunt').size, found=storedSet('jma_found').size, savedBuilds=readStoredArray('jma_saved_builds').length;
  const total=Math.max(entries.length,1), pct=n=>Math.min(100,Math.round((n/total)*100));
  const fmtDate=v=>{if(!v)return '—';const d=new Date(`${v}T00:00:00`);return Number.isNaN(+d)?escapeHtml(v):d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})};
  const miniNews=secondary.map((n,i)=>`<a class="landing-news-mini n${i+1}" href="#/news"><span class="landing-news-mini-art"></span><span class="landing-news-mini-copy"><small>${escapeHtml(n.category||'ARCHIV')} · ${fmtDate(n.date)}</small><b>${escapeHtml(homeBrandText(n.title))}</b><em>${escapeHtml(homeBrandText(n.summary||''))}</em></span><i>›</i></a>`).join('');
  const catalogSnapshot=`<a class="landing-news-mini catalog" href="#/database"><span class="landing-news-mini-art"></span><span class="landing-news-mini-copy"><small>DATENBANK · ${escapeHtml(String(globalThis.CATALOG_DATA?.snapshot||'Snapshot'))}</small><b>${entries.length} kuratierte Einträge aktiv</b><em>${cats.length} Kategorien sind im aktuellen Archivstand verknüpft.</em></span><i>›</i></a>`;
  return `<div class="landing">
    <section class="landing-hero">
      <div class="landing-hero-art" aria-hidden="true"></div>
      <div class="landing-hero-shell">
        <div class="landing-copy">
          <div class="landing-kicker">ONCE HUMAN</div>
          <h1 class="landing-title"><span>ONCE HUMAN</span><strong>ARCHIV</strong></h1>
          <div class="landing-subtitle">DEINE ZENTRALE WISSENSPLATTFORM FÜR ONCE HUMAN</div>
          <p>Guides, Daten, Builds, Karten, Community und Werkzeuge an einem Ort. Übersichtlich verbunden mit den vorhandenen Archivfunktionen und deinem lokalen Fortschritt.</p>
          <div class="landing-actions"><a class="landing-primary" href="#/database"${gateAttr}><span>JETZT ENTDECKEN</span><span aria-hidden="true">→</span></a><button class="landing-video" type="button" id="videoInfo"><span>▶</span> ARCHIV ANSEHEN</button></div>
          <div class="landing-trust"><span>◷ <b>Aktuell</b></span><span>♙ <b>Community-getrieben</b></span><span>◇ <b>Werbefrei</b></span><span>⌁ <b>Für alle Spieler</b></span></div>
        </div>
        <div class="landing-hero-space" aria-hidden="true"></div>
      </div>
    </section>

    <div class="landing-content">
      <section class="landing-quick-grid" aria-label="Schnellzugriffe">
        ${quick('database','Datenbank','Gegenstände, Waffen, Ausrüstung, Ressourcen und mehr.','feature-database.webp','▱',guest)}
        ${quick('map','Interaktive Karte','Marker, Routen, Fundorte und Gebiete.','feature-map.webp','⌖',guest)}
        ${quick('builds','Builds','Vorlagen, Loadouts und gespeicherte Builds.','feature-builds.webp','⚒',guest)}
        ${quick('tech-workbench','Techwerkbank','Rezepte, Materialien und Herstellung.','feature-tech.webp','⚙',guest)}
        ${quick('community','Community','Wissen teilen und Beiträge austauschen.','feature-community.webp','♙',guest)}
        ${quick('guides','Guides','Strukturiertes Wissen und Hilfen.','feature-guides.webp','◫',guest)}
      </section>

      <div class="landing-main-grid">
        <section class="landing-update">
          <div class="landing-section-head"><h2>Aktuelles Update</h2><a href="#/news">Alle Neuigkeiten →</a></div>
          <div class="landing-news-grid">
            <article class="landing-news-feature"><div class="landing-news-feature-copy"><div><span class="tag">${escapeHtml(featured?.category||'ARCHIV')}</span><small>${fmtDate(featured?.date)}</small></div><h3>${escapeHtml(homeBrandText(featured?.title||'Archivstand aktualisiert').replace(/JAZZEMEOW\s+ARCHIVE/gi,'ONCE HUMAN ARCHIV'))}</h3><p>${escapeHtml(homeBrandText(featured?.summary||'Der aktuelle Website-Stand ist als funktionierende Archivoberfläche verfügbar.'))}</p><a class="landing-primary landing-compact" href="#/news">DETAILS ANSEHEN →</a></div></article>
            <div class="landing-news-stack">${miniNews}${secondary.length<3?catalogSnapshot:''}</div>
          </div>
        </section>

        <section class="landing-status">
          <div class="landing-section-head"><h2>Plattform in Zahlen</h2><a href="#/database"${gateAttr}>Mehr erfahren →</a></div>
          <div class="landing-stats"><div class="landing-stat"><i>◫</i><span><b>${ROUTES.length}</b><small>Haupt-Routen</small></span></div><div class="landing-stat"><i>⚒</i><span><b>${builds.length}</b><small>Build-Vorlagen</small></span></div><div class="landing-stat"><i>▱</i><span><b>${entries.length}</b><small>kuratierte Einträge</small></span></div><div class="landing-stat"><i>◇</i><span><b>${cats.length}</b><small>Kategorien</small></span></div></div>
          <div class="landing-community"><div><small>COMMUNITY CORE</small><h3>GEMEINSAM WISSEN AUFBAUEN</h3><p>Beiträge, Builds und geprüfte Archivdaten greifen auf denselben vorhandenen Datenstand zu.</p><a class="landing-secondary" href="#/community"${gateAttr}>ZUR COMMUNITY →</a></div></div>
        </section>
      </div>

      <section class="landing-showcase">
        <div class="landing-section-head"><h2>Archiv-Schnellzugriff</h2><span>Echte Daten aus dem aktuellen Stand</span></div>
        <div class="landing-showcase-grid">
          <a href="#/database" class="landing-showcase-card weapons" data-home-category="weapons"${gateAttr}>${gateBadge}<div><small>WAFFEN</small><b>${countCat('weapons')} kuratierte Waffen-Einträge</b><span>Datenbank öffnen →</span></div></a>
          <a href="#/database" class="landing-showcase-card items" data-home-category="items"${gateAttr}>${gateBadge}<div><small>GEGENSTÄNDE</small><b>${countCat('items')} kuratierte Item-Einträge</b><span>Datenbank öffnen →</span></div></a>
          <a href="#/builds" class="landing-showcase-card builds"${gateAttr}>${gateBadge}<div><small>BUILDS</small><b>${builds.length} vorhandene Build-Vorlagen</b><span>Builds öffnen →</span></div></a>
          <article class="landing-progress"><header><div><small>DEIN ARCHIV</small><h3>Lokaler Fortschritt</h3></div><a href="#/dashboard"${gateAttr}>Kommandozentrale →</a></header><div class="landing-progress-row"><span>Favoriten <b>${favorites}</b></span><i><em style="width:${pct(favorites)}%"></em></i></div><div class="landing-progress-row"><span>Jagdliste <b>${hunt}</b></span><i><em style="width:${pct(hunt)}%"></em></i></div><div class="landing-progress-row"><span>Gefunden <b>${found}</b></span><i><em style="width:${pct(found)}%"></em></i></div><div class="landing-progress-row"><span>Gespeicherte Builds <b>${savedBuilds}</b></span><i><em style="width:${Math.min(100,savedBuilds*25)}%"></em></i></div><p>Die Werte stammen ausschließlich aus deiner lokalen Browser-Speicherung.</p></article>
        </div>
      </section>
    </div>
  </div>`;
}
function renderDevelopment(route){
  return `<section class="development-page"><div class="route-number">ROUTE ${String(route.order).padStart(2,'0')} / ${ROUTES.length}</div><h1>${escapeHtml(route.label)}</h1><p>${escapeHtml(route.purpose)}.</p><div class="dev-notice"><b>ENTWICKLUNGSSTATUS:</b> Diese Route ist aus dem vorhandenen Altprojekt verifiziert und im Routing bereits vorhanden. Ihre endgültige Oberfläche und Fachlogik werden im nächsten Arbeitspaket aus den vorhandenen Projektdaten übernommen. Sie wird nicht als „fertig“ dokumentiert, bevor Funktionen und Browsertests bestanden sind.</div><div class="actions"><a class="cyan-btn compact" href="#/home" style="display:inline-flex;align-items:center;text-decoration:none">← ZUR STARTSEITE</a><button class="ghost-btn" type="button" id="openSearchFromDev">ARCHIV DURCHSUCHEN</button></div></section>`;
}
function routeFromHash(){return (location.hash.replace(/^#\/?/,'').split('/')[0]||'home');}
function render(){
  let id=routeFromHash();
  if(id==='collection'){
    globalThis.JMA_STORE?.write?.('jma_profile_view','collection');
    id='profile';
    history.replaceState(null,'','#/profile');
  }
  const hasSession=!!globalThis.JMA_AUTH?.getState?.().session?.user;
  const blockedRoute=!hasSession&&AUTH_REQUIRED_ROUTES.has(id);
  if(blockedRoute){
    id='home';
    history.replaceState(null,'','#/home');
  }
  let route=ROUTES.find(r=>r.id===id)||(id==='live-map'?{id:'live-map',label:'Live Karte',icon:'⌖',purpose:'Isolierte interaktive Karten-Vorschau'}:id==='settings'?{id:'settings',label:'Einstellungen',icon:'◌',purpose:'Darstellung und Oberflächenoptionen'}:id==='admin'?{id:'admin',label:'Admin Backend',icon:'◇',purpose:'Geschütztes CMS und Verwaltungszentrum'}:null);
  if(!route){route=ROUTES[0];history.replaceState(null,'','#/home');}
  document.title=`Once Human Archiv // ${route.label}`;
  document.body.className=document.body.className.replace(/\broute-[^\s]+/g,'').trim(); document.body.classList.add(`route-${route.id}`);
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===route.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  closeNavigation();
  const fullRenderer=globalThis.FULL_ROUTE_RENDERERS?.[route.id];
  app.innerHTML=route.id==='home'?renderHome():route.id==='database'?renderDatabase():fullRenderer?fullRenderer(route):renderDevelopment(route);
  syncHeaderAccount();
  bindView(); window.scrollTo({top:0,behavior:'instant'}); app.focus({preventScroll:true});
  if(blockedRoute) setTimeout(()=>openAuth('login'),0);
}
function authErrorMessage(error,fallback='Anmeldung fehlgeschlagen.'){
  const message=String(error?.message||'').trim();
  if(/invalid login credentials/i.test(message)) return 'E-Mail oder Passwort stimmen nicht.';
  if(/email not confirmed/i.test(message)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  if(/user already registered/i.test(message)) return 'Für diese E-Mail-Adresse existiert bereits ein Konto.';
  if(/password/i.test(message)&&/least|short|length/i.test(message)) return 'Das Passwort erfüllt die Supabase-Passwortvorgaben noch nicht.';
  return message||fallback;
}
function setAuthMessage(message='',type='error'){
  const el=$('#authLoginError');
  if(!el) return;
  el.textContent=message;
  el.classList.toggle('login-success',type==='success');
  el.hidden=!message;
}
function setAccountMenu(open=false){
  const menu=$('#headerAccountMenu'),trigger=$('#headerAccountTrigger');
  if(menu) menu.hidden=!open;
  if(trigger) trigger.setAttribute('aria-expanded',open?'true':'false');
}
function syncHeaderAccount(){
  const authState=globalThis.JMA_AUTH?.getState?.()||{};
  const account=authState.account||globalThis.JMA_AUTH?.getAccount?.()||null;
  const signedIn=!!authState.session?.user&&!!account;
  const guest=!signedIn;
  const guestHome=guest&&routeFromHash()==='home';
  document.body.classList.toggle('home-guest-showcase',guestHome);
  mainNav.classList.toggle('hidden',guest);
  if(guest) mainNav.classList.remove('open');
  $('#searchTrigger')?.classList.toggle('hidden',guest);
  $('#menuToggle')?.classList.toggle('hidden',guest);
  $('#loginOpen')?.classList.toggle('hidden',signedIn);
  $('#registerOpen')?.classList.toggle('hidden',signedIn);
  const control=$('#headerAccount');
  if(!control) return;
  control.hidden=!signedIn;
  if(!signedIn){
    setAccountMenu(false);
    return;
  }
  const name=account.name||account.email||'Meta-Human';
  $('#headerAccountAvatar').textContent=name.slice(0,1).toUpperCase();
  $('#headerAccountName').textContent=name;
  $('#headerAccountStatus').textContent=account.role?String(account.role).toUpperCase():'ANGEMELDET';
  $('#headerAccountEmail').textContent=account.email||'';
  const accountMenu=$('#headerAccountMenu');
  let liveMapLink=$('#headerLiveMapLink');
  if(routeFromHash()==='admin'){
    liveMapLink?.remove();
  }else if(accountMenu&&!liveMapLink){
    liveMapLink=document.createElement('a');
    liveMapLink.id='headerLiveMapLink';
    liveMapLink.href='#/live-map';
    liveMapLink.dataset.accountMenuLink='';
    liveMapLink.textContent='Live Karte';
    const settingsLink=accountMenu.querySelector('a[href="#/settings"]');
    accountMenu.insertBefore(liveMapLink,settingsLink||$('#headerAdminLink')||$('#headerLogout'));
  }
  const adminLink=$('#headerAdminLink');
  if(adminLink) adminLink.hidden=!['moderator','admin','owner'].includes(String(account.role||'').toLowerCase());
}
function showWelcome(account){
  const box=$('#authWelcome'),name=$('#authWelcomeName');
  if(!box||!name) return;
  name.textContent=account?.name||account?.email||'Meta-Human';
  clearTimeout(showWelcome.hideTimer);
  clearTimeout(showWelcome.finishTimer);
  box.hidden=false;
  requestAnimationFrame(()=>box.classList.add('show'));
  showWelcome.hideTimer=setTimeout(()=>{
    box.classList.remove('show');
    showWelcome.finishTimer=setTimeout(()=>{box.hidden=true},320);
  },3600);
}
async function signInWithSupabase(email,password){
  return globalThis.JMA_AUTH.signInWithPassword(email,password);
}
async function registerWithSupabase(email,password,name){
  return globalThis.JMA_AUTH.signUp(email,password,name);
}
async function bindAuthSubmit(button,action){
  if(button?.disabled) return;
  if(button) button.disabled=true;
  try{return await action()}finally{if(button) button.disabled=false}
}
function bindView(){
  const activeRoute=routeFromHash();
  if(activeRoute==='database') bindDatabase();
  globalThis.FULL_ROUTE_BINDERS?.[activeRoute]?.();
  document.querySelectorAll('[data-showcase-gated]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    openAuth('login');
  }));
  document.querySelectorAll('[data-home-category]').forEach(a=>a.addEventListener('click',()=>{DB_STATE.category=a.dataset.homeCategory||'all';DB_STATE.q='';DB_STATE.status='all'}));
  $('#videoInfo')?.addEventListener('click',()=>toast('Projektvorschau: Das Archiv ist echte programmierte UI; die Bereiche greifen auf denselben lokalen Arbeitsstand zu.'));
  $('#openSearchFromDev')?.addEventListener('click',openSearch);
}
function openAuth(mode='login',email=''){
  authMode=mode;
  const reg=mode==='register',forgot=mode==='forgot',recovery=mode==='recovery';
  const titles={login:'WILLKOMMEN ZURÜCK',register:'ARCHIVZUGANG ERSTELLEN',forgot:'PASSWORT ZURÜCKSETZEN',recovery:'NEUES PASSWORT FESTLEGEN'};
  const copies={
    login:'Melde dich mit deinem Archivkonto an.',
    register:'Erstelle dein Archivkonto.',
    forgot:'Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen des Passworts.',
    recovery:'Lege jetzt ein neues Passwort für dein Archivkonto fest.'
  };
  const submits={login:'ANMELDEN →',register:'REGISTRIEREN →',forgot:'RESET-LINK SENDEN →',recovery:'PASSWORT SPEICHERN →'};

  $('#authTitle').textContent=titles[mode]||titles.login;
  $('#authCopy').textContent=copies[mode]||copies.login;
  $('#authSubmit').textContent=submits[mode]||submits.login;
  $('#authSwitch').innerHTML=reg?'Schon ein Konto? <u>Anmelden</u>':forgot?'Zurück zur <u>Anmeldung</u>':recovery?'Abbrechen und zur <u>Anmeldung</u>':'Noch kein Konto? <u>Jetzt registrieren</u>';
  $('#authForgot').classList.toggle('hidden',mode!=='login');

  $('#authEmailField').classList.toggle('hidden',recovery);
  $('#authPasswordField').classList.toggle('hidden',forgot);
  $('#authPasswordRepeatField').classList.toggle('hidden',!recovery);
  $('#nameField').classList.toggle('hidden',!reg);

  $('#authEmail').required=!recovery;
  $('#authPassword').required=!forgot;
  $('#authPasswordRepeat').required=recovery;
  $('#authName').required=reg;
  $('#authEmail').value=email||'';
  $('#authPassword').value='';
  $('#authPasswordRepeat').value='';
  $('#authPassword').autocomplete=(reg||recovery)?'new-password':'current-password';
  $('#authPasswordLabel').textContent=recovery?'Neues Passwort':'Passwort';
  if(recovery) $('#authPassword').removeAttribute('minlength');
  else $('#authPassword').setAttribute('minlength','4');

  setAuthMessage();
  const dialog=$('#authDialog');
  if(!dialog.open) dialog.showModal();
  const focusTarget=recovery?$('#authPassword'):$('#authEmail');
  setTimeout(()=>focusTarget?.focus(),20);
}
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#authEmail').value.trim(),pass=$('#authPassword').value,repeat=$('#authPasswordRepeat').value,button=$('#authSubmit');
  setAuthMessage();
  try{
    if(authMode==='forgot'){
      await bindAuthSubmit(button,()=>globalThis.JMA_AUTH.resetPasswordForEmail(email));
      setAuthMessage('Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet.','success');
      return;
    }
    if(authMode==='recovery'){
      if(!pass||!repeat){
        setAuthMessage('Bitte fülle beide Passwortfelder aus.');
        return;
      }
      if(pass!==repeat){
        setAuthMessage('Die beiden Passwörter stimmen nicht überein.');
        return;
      }
      await bindAuthSubmit(button,()=>globalThis.JMA_AUTH.updatePassword(pass));
      await globalThis.JMA_AUTH.finishRecovery();
      render();
      openAuth('login');
      setAuthMessage('Passwort erfolgreich geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.','success');
      return;
    }
    if(authMode==='register'){
      const result=await bindAuthSubmit(button,()=>registerWithSupabase(email,pass,$('#authName').value.trim()||'Meta-Human'));
      $('#authDialog').close();
      if(result.requiresEmailConfirmation){
        toast('Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.');
      }else{
        toast(`Willkommen, ${result.account?.name||result.account?.email||'Meta-Human'}.`);
      }
      render();
      return;
    }
    const account=await bindAuthSubmit(button,()=>signInWithSupabase(email,pass));
    $('#authDialog').close();
    render();
    showWelcome(account);
  }catch(error){
    if(authMode==='login') setAuthMessage(authErrorMessage(error,'Anmeldung fehlgeschlagen.'));
    else if(authMode==='forgot') setAuthMessage('Die Recovery-E-Mail konnte gerade nicht gesendet werden. Bitte versuche es später erneut.');
    else if(authMode==='recovery') setAuthMessage(authErrorMessage(error,'Das neue Passwort konnte nicht gespeichert werden.'));
    else toast(authErrorMessage(error,'Registrierung fehlgeschlagen.'));
  }
});
$('#authForgot').addEventListener('click',()=>openAuth('forgot',$('#authEmail').value));
$('#authSwitch').addEventListener('click',async()=>{
  if(authMode==='forgot'){
    openAuth('login',$('#authEmail').value);
    return;
  }
  if(authMode==='recovery'){
    try{
      await globalThis.JMA_AUTH.finishRecovery();
      render();
      openAuth('login');
    }catch(error){setAuthMessage(authErrorMessage(error,'Recovery-Sitzung konnte nicht beendet werden.'))}
    return;
  }
  openAuth(authMode==='login'?'register':'login',$('#authEmail').value);
});
$('#authClose').addEventListener('click',async()=>{
  if(authMode==='recovery'){
    try{
      await globalThis.JMA_AUTH.finishRecovery();
      $('#authDialog').close();
      render();
    }catch(error){setAuthMessage(authErrorMessage(error,'Recovery-Sitzung konnte nicht beendet werden.'))}
    return;
  }
  $('#authDialog').close();
});
$('#loginOpen').addEventListener('click',()=>openAuth('login')); $('#registerOpen').addEventListener('click',()=>openAuth('register'));
$('#headerAccountTrigger').addEventListener('click',e=>{
  e.stopPropagation();
  setAccountMenu($('#headerAccountMenu').hidden);
});
$('#headerAccountMenu').addEventListener('click',e=>{
  if(e.target.closest('[data-account-menu-link]')) setAccountMenu(false);
});
$('#headerLogout').addEventListener('click',async()=>{
  setAccountMenu(false);
  try{
    await globalThis.JMA_AUTH.signOut();
    history.replaceState(null,'','#/home');
    toast('Sitzung beendet.');
    render();
  }catch(error){toast(authErrorMessage(error,'Abmeldung fehlgeschlagen.'))}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('#headerAccount')) setAccountMenu(false);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') setAccountMenu(false);
});
function closeNavigation(){mainNav.classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false')}
$('#menuToggle').setAttribute('aria-controls','mainNav');$('#menuToggle').setAttribute('aria-expanded','false');
$('#menuToggle').addEventListener('click',()=>{const open=mainNav.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open))});
mainNav.addEventListener('click',closeNavigation);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNavigation()});
document.addEventListener('click',e=>{if(!e.target.closest('#topbar'))closeNavigation()});
function openSearch(){const q=$('#globalSearch');$('#searchDialog').showModal();q.value='';renderSearch('');setTimeout(()=>q.focus(),10)}
function renderSearch(q){q=q.trim().toLowerCase();const rows=ROUTES.filter(r=>!q||`${r.label} ${r.purpose} ${r.id}`.toLowerCase().includes(q));const entries=q?catalogEntries().filter(e=>[e.name_de,e.kind,...(e.tags||[])].join(' ').toLowerCase().includes(q)).slice(0,8):[];$('#searchResults').innerHTML=rows.map(r=>`<a class="search-result" href="#/${r.id}"><span><b>${escapeHtml(r.label)}</b><small>${escapeHtml(r.purpose)}</small></span><span>${r.icon} →</span></a>`).join('')+entries.map(e=>`<a class="search-result catalog-search-result" href="#/database" data-catalog-jump="${escapeHtml(e.id)}"><span><b>${escapeHtml(e.name_de)}</b><small>Datenbank · ${escapeHtml(e.kind||'Eintrag')}</small></span><span>▱ →</span></a>`).join('')||'<div class="dev-notice">Keine passende Route oder kein Katalogeintrag gefunden.</div>';$('#searchResults').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{$('#searchDialog').close();if(a.dataset.catalogJump){if(routeFromHash()==='database'&&globalThis.JMA_AUTH?.getAccount()){sessionStorage.removeItem('jma_open_catalog');openCatalogDetail(a.dataset.catalogJump)}else sessionStorage.setItem('jma_open_catalog',a.dataset.catalogJump)}}))}
$('#searchTrigger').addEventListener('click',openSearch);$('#searchClose').addEventListener('click',()=>$('#searchDialog').close());$('#globalSearch').addEventListener('input',e=>renderSearch(e.target.value));
$('#newsletterForm').addEventListener('submit',e=>{e.preventDefault();localStorage.setItem('jma_newsletter',$('#newsletterEmail').value.trim());$('#newsletterStatus').textContent='Für diese lokale Demo gespeichert.';toast('Newsletter-Adresse lokal gespeichert.');});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
globalThis.JMA_RENDER=render;
window.addEventListener('hashchange',render);
async function boot(){
  if(!location.hash) history.replaceState(null,'','#/home');
  globalThis.JMA_AUTH.onRecovery(()=>openAuth('recovery'));
  try{
    await globalThis.JMA_AUTH.init();
  }catch(error){
    console.error('Supabase Auth konnte nicht initialisiert werden:',error);
    toast('Anmeldung konnte nicht initialisiert werden.');
  }
  render();
  if(globalThis.JMA_AUTH.isRecovery()) openAuth('recovery');
}
boot();
