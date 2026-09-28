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
  ['collection','Meine Sammlung','▦','Favoriten, gefunden, Jagdziele und Sammlung'],
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
mainNav.innerHTML = NAV.map(([id,label,icon])=>`<a href="#/${id}" data-nav="${id}"><span>${icon}</span>${label}</a>`).join('');

function asset(name){ return `./assets/reference/${name}`; }
function quick(route,title,desc,img,icon){return `<a class="quick-card" href="#/${route}" style="--quick-image:url('${asset(img)}')"><span class="quick-visual"></span><span class="quick-body"><i>${icon}</i><span><h3>${title}</h3><p>${desc}</p></span><b aria-hidden="true">›</b></span></a>`}

const DB_STATE={q:'',category:'all',status:'all'};
function catalogEntries(){return Array.isArray(globalThis.CATALOG_DATA?.entries)?globalThis.CATALOG_DATA.entries:[]}
function catalogCategories(){return Array.isArray(globalThis.CATALOG_DATA?.categories)?globalThis.CATALOG_DATA.categories:[]}
function categoryFor(id){return catalogCategories().find(c=>c.id===id)||{id,label:id||'Unbekannt',icon:'◇',subcategories:[]}}
function storedSet(key){try{return new Set(JSON.parse(localStorage.getItem(key)||'[]'))}catch{return new Set()}}
function writeSet(key,set){localStorage.setItem(key,JSON.stringify([...set]))}
function filteredCatalog(){
  const q=DB_STATE.q.trim().toLowerCase();
  return catalogEntries().filter(e=>{
    const hay=[e.name_de,e.kind,e.description,e.acquisition,e.status,...(e.tags||[])].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(DB_STATE.category==='all'||e.category===DB_STATE.category)&&(DB_STATE.status==='all'||e.status===DB_STATE.status);
  });
}
function catalogCard(e){
  const c=categoryFor(e.category),fav=storedSet('jma_favorites').has(e.id),hunt=storedSet('jma_hunt').has(e.id);
  return `<article class="catalog-card" data-entry="${escapeHtml(e.id)}"><div class="catalog-card-top"><span class="catalog-glyph">${escapeHtml(c.icon||'◇')}</span><div><small>${escapeHtml(c.label)}</small><h3>${escapeHtml(e.name_de)}</h3></div></div><p>${escapeHtml(e.kind||'Archiv-Eintrag')}</p><div class="catalog-tags">${(e.tags||[]).slice(0,3).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div><div class="catalog-status"><i></i>${escapeHtml(e.status||'Prüfstatus offen')}</div><div class="catalog-actions"><button type="button" data-db-detail="${escapeHtml(e.id)}">DETAILS</button><button class="icon-action ${fav?'active':''}" type="button" data-db-fav="${escapeHtml(e.id)}" title="Favorit">★</button><button class="icon-action ${hunt?'active':''}" type="button" data-db-hunt="${escapeHtml(e.id)}" title="Jagdliste">◎</button></div></article>`;
}
function renderCatalogGrid(){
  const grid=$('#catalogGrid'); if(!grid)return;
  const rows=filteredCatalog();
  grid.innerHTML=rows.map(catalogCard).join('')||`<div class="catalog-empty"><b>KEIN TREFFER</b><span>Ändere Suche oder Filter.</span></div>`;
  $('#catalogResultCount').textContent=`${rows.length} / ${catalogEntries().length} Einträge`;
  document.querySelectorAll('[data-db-category]').forEach(b=>b.classList.toggle('active',b.dataset.dbCategory===DB_STATE.category));
}
function renderDatabase(){
  const counts=globalThis.CATALOG_DATA?.reference_counts||{}, statuses=[...new Set(catalogEntries().map(e=>e.status).filter(Boolean))];
  return `<section class="database-page">
    <header class="database-hero"><div class="database-hero-copy"><div class="section-kicker">ARCHIV // KATALOG</div><h1>DATENBANK</h1><p>Der zentrale geprüfte Katalog des Archivs. Suche, filtere, öffne Details und übernimm Einträge direkt in Favoriten oder Jagdliste.</p><div class="database-metrics"><span><b>${catalogEntries().length}</b><small>kuratiert übernommen</small></span><span><b>${catalogCategories().length}</b><small>Kategorien</small></span><span><b>${escapeHtml(String(globalThis.CATALOG_DATA?.snapshot||'—'))}</b><small>Quell-Snapshot</small></span></div></div><div class="database-reference"><small>REFERENZUMFANG DES ALTSTANDS</small><div><b>${Number(counts.items||0).toLocaleString('de-DE')}</b><span>Items</span></div><div><b>${Number(counts.weapons||0).toLocaleString('de-DE')}</b><span>Waffen</span></div><div><b>${Number(counts.mods||0).toLocaleString('de-DE')}</b><span>Mods</span></div><div><b>${Number(counts.deviations||0).toLocaleString('de-DE')}</b><span>Abweichler</span></div><em>Diese Referenzzahlen stammen aus dem dokumentierten R18.3-Snapshot; als konkrete Karten werden hier nur die 21 im Altstand kuratierten Datensätze veröffentlicht.</em></div></header>
    <div class="database-shell"><aside class="catalog-rail"><div class="rail-title"><small>KATEGORIEN</small><b>ARCHIVBEREICHE</b></div><button class="active" data-db-category="all"><span>⌘</span><b>Alle Einträge</b><small>${catalogEntries().length}</small></button>${catalogCategories().map(c=>`<button data-db-category="${escapeHtml(c.id)}"><span>${escapeHtml(c.icon||'◇')}</span><b>${escapeHtml(c.label)}</b><small>${catalogEntries().filter(e=>e.category===c.id).length}</small></button>`).join('')}</aside>
      <div class="catalog-main"><div class="catalog-toolbar"><label class="catalog-search"><span>⌕</span><input id="catalogSearch" value="${escapeHtml(DB_STATE.q)}" placeholder="Name, Tag, Typ oder Beschreibung durchsuchen …"></label><select id="catalogStatus"><option value="all">Alle Prüfstatus</option>${statuses.map(x=>`<option ${DB_STATE.status===x?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select><button class="ghost-btn" id="catalogReset" type="button">FILTER ZURÜCKSETZEN</button></div><div class="catalog-list-head"><div><small>ERGEBNISSE</small><b id="catalogResultCount"></b></div><div><a href="#/collection">★ Favoriten</a><a href="#/hunt">◎ Jagdliste</a></div></div><div class="catalog-grid" id="catalogGrid"></div></div>
    </div>
  </section>`;
}
function ensureCatalogDialog(){
  let d=$('#catalogDialog'); if(d)return d;
  d=document.createElement('dialog');d.id='catalogDialog';d.className='catalog-dialog';document.body.appendChild(d);return d;
}
function openCatalogDetail(id){
  const e=catalogEntries().find(x=>x.id===id);if(!e)return;const c=categoryFor(e.category),d=ensureCatalogDialog(),fav=storedSet('jma_favorites').has(id),hunt=storedSet('jma_hunt').has(id);
  d.innerHTML=`<button class="dialog-close" data-db-close type="button">×</button><div class="catalog-detail-visual"><span>${escapeHtml(c.icon||'◇')}</span><small>${escapeHtml(c.label)}</small></div><div class="catalog-detail-body"><div class="section-kicker">ARCHIV-EINTRAG</div><h2>${escapeHtml(e.name_de)}</h2><p class="catalog-kind">${escapeHtml(e.kind||'')}</p><div class="catalog-detail-tags">${(e.tags||[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div><section><small>BESCHREIBUNG</small><p>${escapeHtml(e.description||'Für diesen Eintrag liegt im übernommenen Altstand noch keine Beschreibung vor.')}</p></section><section><small>ERHALT / FUNDWEG</small><p>${escapeHtml(e.acquisition||'Im übernommenen Altstand nicht abschließend dokumentiert.')}</p></section><div class="catalog-detail-meta"><span><small>PRÜFSTATUS</small><b>${escapeHtml(e.status||'offen')}</b></span><span><small>ZULETZT GEPRÜFT</small><b>${escapeHtml(e.last_checked||'—')}</b></span></div><div class="actions"><button class="ghost-btn ${fav?'active-control':''}" data-db-fav="${escapeHtml(id)}" type="button">★ ${fav?'FAVORIT ENTFERNEN':'ALS FAVORIT'}</button><button class="cyan-btn compact ${hunt?'active-control':''}" data-db-hunt="${escapeHtml(id)}" type="button">◎ ${hunt?'VON JAGDLISTE':'ZUR JAGDLISTE'}</button></div></div>`;
  d.querySelector('[data-db-close]').addEventListener('click',()=>d.close());
  d.querySelectorAll('[data-db-fav]').forEach(b=>b.addEventListener('click',()=>{toggleCatalogSet('jma_favorites',id,'Favorit');d.close();renderCatalogGrid();openCatalogDetail(id)}));
  d.querySelectorAll('[data-db-hunt]').forEach(b=>b.addEventListener('click',()=>{toggleCatalogSet('jma_hunt',id,'Jagdliste');d.close();renderCatalogGrid();openCatalogDetail(id)}));
  d.showModal();
}
function toggleCatalogSet(key,id,label){const s=storedSet(key);const adding=!s.has(id);adding?s.add(id):s.delete(id);writeSet(key,s);toast(`${label}: ${adding?'hinzugefügt':'entfernt'}.`)}
function bindDatabase(){
  $('#catalogSearch')?.addEventListener('input',e=>{DB_STATE.q=e.target.value;renderCatalogGrid()});
  $('#catalogStatus')?.addEventListener('change',e=>{DB_STATE.status=e.target.value;renderCatalogGrid()});
  $('#catalogReset')?.addEventListener('click',()=>{DB_STATE.q='';DB_STATE.category='all';DB_STATE.status='all';render()});
  document.querySelectorAll('[data-db-category]').forEach(b=>b.addEventListener('click',()=>{DB_STATE.category=b.dataset.dbCategory;renderCatalogGrid()}));
  $('#catalogGrid')?.addEventListener('click',e=>{const detail=e.target.closest('[data-db-detail]'),fav=e.target.closest('[data-db-fav]'),hunt=e.target.closest('[data-db-hunt]');if(detail)return openCatalogDetail(detail.dataset.dbDetail);if(fav){toggleCatalogSet('jma_favorites',fav.dataset.dbFav,'Favorit');return renderCatalogGrid()}if(hunt){toggleCatalogSet('jma_hunt',hunt.dataset.dbHunt,'Jagdliste');return renderCatalogGrid()}});
  renderCatalogGrid();
  const pending=sessionStorage.getItem('jma_open_catalog');if(pending){sessionStorage.removeItem('jma_open_catalog');setTimeout(()=>openCatalogDetail(pending),20)}
}
function readStoredArray(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function renderHome(){
  const account = JSON.parse(localStorage.getItem('jma_session')||'null');
  const entries=catalogEntries(), cats=catalogCategories(), archive=globalThis.ARCHIVE_DATA||{}, news=archive.seed?.news||[], builds=archive.seed?.builds||[];
  const featured=news.find(n=>n.featured)||news[0];
  const secondary=news.filter(n=>!featured||n.id!==featured.id).slice(0,3);
  const countCat=id=>entries.filter(e=>e.category===id).length;
  const favorites=storedSet('jma_favorites').size, hunt=storedSet('jma_hunt').size, found=storedSet('jma_found').size, savedBuilds=readStoredArray('jma_saved_builds').length;
  const total=Math.max(entries.length,1), pct=n=>Math.min(100,Math.round((n/total)*100));
  const fmtDate=v=>{if(!v)return '—';const d=new Date(`${v}T00:00:00`);return Number.isNaN(+d)?escapeHtml(v):d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})};
  const miniNews=secondary.map(n=>`<a class="news-mini" href="#/news"><span class="news-mini-thumb"></span><span><small>${escapeHtml(n.category||'ARCHIV')} · ${fmtDate(n.date)}</small><b>${escapeHtml(n.title)}</b><em>${escapeHtml(n.summary||'')}</em></span><i>›</i></a>`).join('');
  const catalogSnapshot=`<a class="news-mini" href="#/database"><span class="news-mini-thumb catalog"></span><span><small>DATENBANK · ${escapeHtml(String(globalThis.CATALOG_DATA?.snapshot||'Snapshot'))}</small><b>${entries.length} kuratierte Einträge aktiv</b><em>${cats.length} Kategorien sind im aktuellen Archivstand verknüpft.</em></span><i>›</i></a>`;
  return `<div class="home home-rebuild">
    <section class="hero home-hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <div class="section-kicker">ONCE HUMAN</div>
          <h1 class="hero-title">JAZZEMEOW <span>ARCHIV</span></h1>
          <div class="hero-subtitle">DEINE ZENTRALE WISSENSPLATTFORM FÜR ONCE HUMAN</div>
          <p>Guides, Daten, Builds, Karten, Community und Werkzeuge an einem Ort. Der aktuelle Archivstand verbindet die vorhandenen Funktionen mit einer deutlich dichteren, bildgetragenen Oberfläche.</p>
          <div class="actions hero-actions"><a class="cyan-btn compact" href="#/database">JETZT ENTDECKEN →</a><button class="video-btn" type="button" id="videoInfo"><span>▶</span> ARCHIV ANSEHEN</button></div>
          <div class="hero-trust"><span>◷ <b>Aktuell</b></span><span>♙ <b>Community-getrieben</b></span><span>◇ <b>Werbefrei</b></span><span>⌁ <b>Für alle Spieler</b></span></div>
        </div>
        <div class="hero-center" aria-hidden="true"></div>
        <aside class="hero-login">
          ${account ? `<div class="account-head"><span class="account-avatar">${escapeHtml((account.name||account.email||'M').slice(0,1).toUpperCase())}</span><div><small>ARCHIV-PROFIL</small><h2>${escapeHtml(account.name||'META-HUMAN')}</h2><p>${escapeHtml(account.email||'Lokale Sitzung aktiv')}</p></div></div><div class="account-metrics"><span><b>${favorites}</b><small>Favoriten</small></span><span><b>${hunt}</b><small>Jagdliste</small></span><span><b>${savedBuilds}</b><small>Builds</small></span></div><button class="cyan-btn full" id="dashboardOpen" type="button">ZUR KOMMANDOZENTRALE →</button><button class="text-link" id="logoutBtn" type="button"><u>Lokale Sitzung abmelden</u></button>` : `<div class="login-kicker">ARCHIVZUGANG</div><h2>WILLKOMMEN ZURÜCK</h2><p>Melde dich an und werde Teil der Community.</p><form id="heroLoginForm"><label><span>✉</span><input type="email" id="heroEmail" placeholder="E-Mail-Adresse" required></label><label><span>▣</span><input type="password" id="heroPassword" placeholder="Passwort" minlength="4" required></label><div class="login-options"><label class="remember"><input type="checkbox"> Angemeldet bleiben</label><button class="text-link inline" type="button" id="heroForgot">Passwort vergessen?</button></div><button class="cyan-btn full" type="submit">ANMELDEN →</button></form><button class="text-link" id="heroRegister" type="button">Noch kein Konto? <u>Jetzt registrieren</u></button>`}
        </aside>
      </div>
    </section>

    <div class="home-content">
      <section class="quick-grid" aria-label="Schnellzugriffe">
        ${quick('database','Datenbank','Gegenstände, Waffen, Ausrüstung, Ressourcen und mehr.','feature-database.webp','▱')}
        ${quick('map','Interaktive Karte','Marker, Routen, Fundorte und Gebiete.','feature-map.webp','⌖')}
        ${quick('builds','Builds','Vorlagen, Loadouts und gespeicherte Builds.','feature-builds.webp','⚒')}
        ${quick('tech-workbench','Techwerkbank','Rezepte, Materialien und Herstellung.','feature-tech.webp','⚙')}
        ${quick('community','Community','Wissen teilen und Beiträge austauschen.','feature-community.webp','♙')}
        ${quick('guides','Guides','Strukturiertes Wissen und Hilfen.','feature-guides.webp','◫')}
      </section>

      <div class="home-lower">
        <section class="home-update-block">
          <div class="section-line"><h2>Aktuelles Update</h2><a href="#/news">Alle Neuigkeiten →</a></div>
          <div class="news-layout">
            <article class="news-feature"><div class="news-feature-content"><span class="tag">${escapeHtml(featured?.category||'ARCHIV')}</span><small>${fmtDate(featured?.date)}</small><h3>${escapeHtml(featured?.title||'Archivstand aktualisiert')}</h3><p>${escapeHtml(featured?.summary||'Der aktuelle Website-Stand ist als funktionierende Archivoberfläche verfügbar.')}</p><a class="cyan-btn compact" href="#/news">DETAILS ANSEHEN →</a></div></article>
            <div class="news-stack">${miniNews}${secondary.length<3?catalogSnapshot:''}</div>
          </div>
        </section>

        <section class="home-status-block">
          <div class="section-line"><h2>Plattform in Zahlen</h2><a href="#/database">Mehr erfahren →</a></div>
          <div class="stats-grid"><div class="stat-box"><i>◫</i><span><b>${ROUTES.length}</b><small>Haupt-Routen</small></span></div><div class="stat-box"><i>⚒</i><span><b>${builds.length}</b><small>Build-Vorlagen</small></span></div><div class="stat-box"><i>▱</i><span><b>${entries.length}</b><small>kuratierte Einträge</small></span></div><div class="stat-box"><i>◇</i><span><b>${cats.length}</b><small>Kategorien</small></span></div></div>
          <div class="community-banner"><div><small>COMMUNITY CORE</small><h3>GEMEINSAM WISSEN AUFBAUEN</h3><p>Beiträge, Builds und geprüfte Archivdaten greifen auf denselben vorhandenen Datenstand zu.</p><a class="ghost-btn" href="#/community">ZUR COMMUNITY →</a></div></div>
        </section>
      </div>

      <section class="home-showcase">
        <div class="section-line"><h2>Archiv-Schnellzugriff</h2><span>Echte Daten aus dem aktuellen Stand</span></div>
        <div class="showcase-grid">
          <a href="#/database" class="showcase-card weapons" data-home-category="weapons"><div class="showcase-copy"><small>WAFFEN</small><b>${countCat('weapons')} kuratierte Waffen-Einträge</b><span>Datenbank öffnen →</span></div></a>
          <a href="#/database" class="showcase-card items" data-home-category="items"><div class="showcase-copy"><small>GEGENSTÄNDE</small><b>${countCat('items')} kuratierte Item-Einträge</b><span>Datenbank öffnen →</span></div></a>
          <a href="#/builds" class="showcase-card builds"><div class="showcase-copy"><small>BUILDS</small><b>${builds.length} vorhandene Build-Vorlagen</b><span>Builds öffnen →</span></div></a>
          <article class="progress-card"><header><div><small>DEIN ARCHIV</small><h3>Lokaler Fortschritt</h3></div><a href="#/dashboard">Kommandozentrale →</a></header><div class="progress-row"><span>Favoriten <b>${favorites}</b></span><i><em style="width:${pct(favorites)}%"></em></i></div><div class="progress-row"><span>Jagdliste <b>${hunt}</b></span><i><em style="width:${pct(hunt)}%"></em></i></div><div class="progress-row"><span>Gefunden <b>${found}</b></span><i><em style="width:${pct(found)}%"></em></i></div><div class="progress-row"><span>Gespeicherte Builds <b>${savedBuilds}</b></span><i><em style="width:${Math.min(100,savedBuilds*25)}%"></em></i></div><p>Die Werte stammen ausschließlich aus deiner lokalen Browser-Speicherung.</p></article>
        </div>
      </section>
    </div>
  </div>`;
}
function renderDevelopment(route){
  return `<section class="development-page"><div class="route-number">ROUTE ${String(route.order).padStart(2,'0')} / 28</div><h1>${escapeHtml(route.label)}</h1><p>${escapeHtml(route.purpose)}.</p><div class="dev-notice"><b>ENTWICKLUNGSSTATUS:</b> Diese Route ist aus dem vorhandenen Altprojekt verifiziert und im Routing bereits vorhanden. Ihre endgültige Oberfläche und Fachlogik werden im nächsten Arbeitspaket aus den vorhandenen Projektdaten übernommen. Sie wird nicht als „fertig“ dokumentiert, bevor Funktionen und Browsertests bestanden sind.</div><div class="actions"><a class="cyan-btn compact" href="#/home" style="display:inline-flex;align-items:center;text-decoration:none">← ZUR STARTSEITE</a><button class="ghost-btn" type="button" id="openSearchFromDev">ARCHIV DURCHSUCHEN</button></div></section>`;
}
function routeFromHash(){return (location.hash.replace(/^#\/?/,'').split('/')[0]||'home');}
function render(){
  let id=routeFromHash(); let route=ROUTES.find(r=>r.id===id);
  if(!route){route=ROUTES[0];history.replaceState(null,'','#/home');}
  document.title=`JazzeMeow Archiv // ${route.label}`;
  document.body.className=document.body.className.replace(/\broute-[^\s]+/g,'').trim(); document.body.classList.add(`route-${route.id}`);
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===route.id));
  const fullRenderer=globalThis.FULL_ROUTE_RENDERERS?.[route.id];
  app.innerHTML=route.id==='home'?renderHome():route.id==='database'?renderDatabase():fullRenderer?fullRenderer(route):renderDevelopment(route);
  bindView(); window.scrollTo({top:0,behavior:'instant'}); app.focus({preventScroll:true});
}
function bindView(){
  const activeRoute=routeFromHash();
  if(activeRoute==='database') bindDatabase();
  globalThis.FULL_ROUTE_BINDERS?.[activeRoute]?.();
  $('#heroLoginForm')?.addEventListener('submit',e=>{e.preventDefault();const known=JSON.parse(localStorage.getItem('jma_account')||'null');const email=$('#heroEmail').value.trim();if(known&&known.email.toLowerCase()===email.toLowerCase()){localStorage.setItem('jma_session',JSON.stringify(known));toast(`Willkommen zurück, ${known.name}.`);render()}else{openAuth('register',email);toast('Für diese lokale Demo existiert noch kein Konto – registriere dich zuerst.')}});
  $('#heroRegister')?.addEventListener('click',()=>openAuth('register'));
  $('#heroForgot')?.addEventListener('click',()=>toast('Passwort-Wiederherstellung ist im lokalen Testkonto noch nicht angebunden.'));
  document.querySelectorAll('[data-home-category]').forEach(a=>a.addEventListener('click',()=>{DB_STATE.category=a.dataset.homeCategory||'all';DB_STATE.q='';DB_STATE.status='all'}));
  $('#dashboardOpen')?.addEventListener('click',()=>location.hash='#/dashboard');
  $('#logoutBtn')?.addEventListener('click',()=>{localStorage.removeItem('jma_session');toast('Lokale Sitzung beendet.');render()});
  $('#videoInfo')?.addEventListener('click',()=>toast('Projektvorschau: Das Archiv ist echte programmierte UI; die Bereiche greifen auf denselben lokalen Arbeitsstand zu.'));
  $('#openSearchFromDev')?.addEventListener('click',openSearch);
}
function openAuth(mode='login',email=''){
  authMode=mode; const reg=mode==='register';
  $('#authTitle').textContent=reg?'ARCHIVZUGANG ERSTELLEN':'WILLKOMMEN ZURÜCK';
  $('#authCopy').textContent=reg?'Erstelle für den Entwicklungsstand ein lokales Testkonto.':'Melde dich mit deinem lokalen Testkonto an.';
  $('#authSubmit').textContent=reg?'REGISTRIEREN →':'ANMELDEN →';
  $('#authSwitch').innerHTML=reg?'Schon ein Konto? <u>Anmelden</u>':'Noch kein Konto? <u>Jetzt registrieren</u>';
  $('#nameField').classList.toggle('hidden',!reg); $('#authName').required=reg; $('#authEmail').value=email;
  $('#authDialog').showModal(); setTimeout(()=>$('#authEmail').focus(),20);
}
$('#authForm').addEventListener('submit',e=>{e.preventDefault();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value; if(authMode==='register'){const acc={email,name:$('#authName').value.trim()||'Meta-Human',password:pass};localStorage.setItem('jma_account',JSON.stringify(acc));localStorage.setItem('jma_session',JSON.stringify(acc));$('#authDialog').close();toast('Lokales Testkonto erstellt.');render();return}const acc=JSON.parse(localStorage.getItem('jma_account')||'null');if(!acc||acc.email.toLowerCase()!==email.toLowerCase()||acc.password!==pass){toast('E-Mail oder Passwort stimmen im lokalen Testkonto nicht.');return}localStorage.setItem('jma_session',JSON.stringify(acc));$('#authDialog').close();toast(`Willkommen zurück, ${acc.name}.`);render();});
$('#authSwitch').addEventListener('click',()=>openAuth(authMode==='login'?'register':'login',$('#authEmail').value));
$('#authClose').addEventListener('click',()=>$('#authDialog').close());
$('#loginOpen').addEventListener('click',()=>openAuth('login')); $('#registerOpen').addEventListener('click',()=>openAuth('register'));
$('#menuToggle').addEventListener('click',()=>mainNav.classList.toggle('open')); mainNav.addEventListener('click',()=>mainNav.classList.remove('open'));
function openSearch(){const q=$('#globalSearch');$('#searchDialog').showModal();q.value='';renderSearch('');setTimeout(()=>q.focus(),10)}
function renderSearch(q){q=q.trim().toLowerCase();const rows=ROUTES.filter(r=>!q||`${r.label} ${r.purpose} ${r.id}`.toLowerCase().includes(q));const entries=q?catalogEntries().filter(e=>[e.name_de,e.kind,...(e.tags||[])].join(' ').toLowerCase().includes(q)).slice(0,8):[];$('#searchResults').innerHTML=rows.map(r=>`<a class="search-result" href="#/${r.id}"><span><b>${escapeHtml(r.label)}</b><small>${escapeHtml(r.purpose)}</small></span><span>${r.icon} →</span></a>`).join('')+entries.map(e=>`<a class="search-result catalog-search-result" href="#/database" data-catalog-jump="${escapeHtml(e.id)}"><span><b>${escapeHtml(e.name_de)}</b><small>Datenbank · ${escapeHtml(e.kind||'Eintrag')}</small></span><span>▱ →</span></a>`).join('')||'<div class="dev-notice">Keine passende Route oder kein Katalogeintrag gefunden.</div>';$('#searchResults').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(a.dataset.catalogJump)sessionStorage.setItem('jma_open_catalog',a.dataset.catalogJump);$('#searchDialog').close()}))}
$('#searchTrigger').addEventListener('click',openSearch);$('#searchClose').addEventListener('click',()=>$('#searchDialog').close());$('#globalSearch').addEventListener('input',e=>renderSearch(e.target.value));
$('#newsletterForm').addEventListener('submit',e=>{e.preventDefault();localStorage.setItem('jma_newsletter',$('#newsletterEmail').value.trim());$('#newsletterStatus').textContent='Für diese lokale Demo gespeichert.';toast('Newsletter-Adresse lokal gespeichert.');});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
globalThis.JMA_RENDER=render;
window.addEventListener('hashchange',render);if(!location.hash)history.replaceState(null,'','#/home');render();
