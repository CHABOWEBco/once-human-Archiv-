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
function quick(route,title,desc,img,icon){return `<a class="quick-card" href="#/${route}" style="--quick-image:url('${asset(img)}')"><h3><span>${icon}</span>${title}</h3><p>${desc}</p></a>`}

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
function renderHome(){
  const account = JSON.parse(localStorage.getItem('jma_session')||'null');
  return `<div class="home">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <div class="section-kicker">ONCE HUMAN</div>
          <h1 class="hero-title">JAZZEMEOW <span>ARCHIV</span></h1>
          <div class="hero-subtitle">DEINE ZENTRALE WISSENSPLATTFORM FÜR ONCE HUMAN</div>
          <p>Guides, Daten, Builds, Karten, Community und Werkzeuge an einem Ort – übersichtlich, nachvollziehbar und auf die tatsächlichen Archivdaten ausgerichtet.</p>
          <div class="actions"><a class="cyan-btn compact" href="#/database" style="display:inline-flex;align-items:center;text-decoration:none">JETZT ENTDECKEN →</a><button class="video-btn" type="button" id="videoInfo"><span>▶</span> PROJEKT ANSEHEN</button></div>
          <div class="hero-trust"><span>Aktuell</span><span>Community-getrieben</span><span>Werbefrei</span><span>Für alle Spieler</span></div>
        </div>
        <div class="hero-center" aria-hidden="true"></div>
        <aside class="hero-login">
          <h2>${account ? `HALLO, ${escapeHtml(account.name||'META-HUMAN')}` : 'WILLKOMMEN ZURÜCK'}</h2>
          <p>${account ? 'Deine lokale Archiv-Sitzung ist aktiv.' : 'Melde dich an und werde Teil der Community.'}</p>
          ${account ? `<button class="cyan-btn full" id="dashboardOpen" type="button">ZUR KOMMANDOZENTRALE →</button><button class="text-link" id="logoutBtn" type="button"><u>Lokale Sitzung abmelden</u></button>` : `<form id="heroLoginForm"><label><input type="email" id="heroEmail" placeholder="✉  E-Mail-Adresse" required></label><label><input type="password" id="heroPassword" placeholder="▣  Passwort" minlength="4" required></label><label class="remember"><input type="checkbox">Angemeldet bleiben</label><button class="cyan-btn full" type="submit">ANMELDEN →</button></form><button class="text-link" id="heroRegister" type="button">Noch kein Konto? <u>Jetzt registrieren</u></button>`}
        </aside>
      </div>
    </section>
    <div class="home-content">
      <section class="quick-grid" aria-label="Schnellzugriffe">
        ${quick('database','Datenbank','Gegenstände, Waffen, Ausrüstung, Ressourcen und mehr.','feature-database.webp','▱')}
        ${quick('map','Interaktive Karte','Routen, Sammelstellen, Events, Gebiete und mehr.','feature-map.webp','⌖')}
        ${quick('builds','Builds','Community-Builds, Meta und eigene Ideen.','feature-builds.webp','⚒')}
        ${quick('tech-workbench','Techwerkbank','Rezepte, Materialien, Herstellung und Mods.','feature-tech.webp','⚙')}
        ${quick('community','Community','Tausche dich aus, teile Wissen und Builds.','feature-community.webp','♙')}
        ${quick('guides','Guides','Von den Grundlagen bis zu fortgeschrittenen Strategien.','feature-guides.webp','◫')}
      </section>
      <div class="home-lower">
        <section>
          <div class="section-line"><h2>Aktuelles Update</h2><a href="#/news">Alle Neuigkeiten →</a></div>
          <div class="news-layout">
            <article class="news-feature"><span class="tag">ARCHIV</span><h3>NEUBAU DES ONCE-HUMAN-ARCHIVS</h3><p>Die neue Oberfläche entsteht auf Basis der vorhandenen Daten, Funktionen und der gelieferten visuellen Soll-Vorlagen.</p><a class="cyan-btn compact" href="#/news" style="display:inline-flex;align-items:center;align-self:flex-start;text-decoration:none">DETAILS ANSEHEN →</a></article>
            <div class="news-stack"><a class="news-mini" href="#/map"><small>KARTE</small><b>Interaktive Kartenstruktur</b></a><a class="news-mini" href="#/builds"><small>WERKZEUG</small><b>Build-Planer wird neu aufgebaut</b></a><a class="news-mini" href="#/community"><small>COMMUNITY</small><b>Wissen & Einreichungen</b></a></div>
          </div>
        </section>
        <section>
          <div class="section-line"><h2>Plattform in Zahlen</h2><a href="#/database">Mehr erfahren →</a></div>
          <div class="stats-grid"><div class="stat-box"><i>◫</i><span><b>28</b><small>bestätigte Haupt-Routen</small></span></div><div class="stat-box"><i>⚒</i><span><b>4+</b><small>zentrale Werkzeuge</small></span></div><div class="stat-box"><i>▱</i><span><b>1</b><small>gemeinsamer Katalog</small></span></div><div class="stat-box"><i>♙</i><span><b>∞</b><small>Community-Wissen</small></span></div></div>
          <div class="community-banner"><h3>GEMEINSAM WISSEN AUFBAUEN</h3><p>Ein Archiv mit nachvollziehbaren Daten, funktionierenden Werkzeugen und Community-Beiträgen – statt einer reinen Design-Demo.</p><a class="ghost-btn" href="#/community" style="display:inline-flex;align-items:center;text-decoration:none">ZUR COMMUNITY →</a></div>
        </section>
      </div>
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
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===route.id));
  app.innerHTML=route.id==='home'?renderHome():route.id==='database'?renderDatabase():renderDevelopment(route);
  bindView(); window.scrollTo({top:0,behavior:'instant'}); app.focus({preventScroll:true});
}
function bindView(){
  if(routeFromHash()==='database') bindDatabase();
  $('#heroLoginForm')?.addEventListener('submit',e=>{e.preventDefault();const known=JSON.parse(localStorage.getItem('jma_account')||'null');const email=$('#heroEmail').value.trim();if(known&&known.email.toLowerCase()===email.toLowerCase()){localStorage.setItem('jma_session',JSON.stringify(known));toast(`Willkommen zurück, ${known.name}.`);render()}else{openAuth('register',email);toast('Für diese lokale Demo existiert noch kein Konto – registriere dich zuerst.')}});
  $('#heroRegister')?.addEventListener('click',()=>openAuth('register'));
  $('#dashboardOpen')?.addEventListener('click',()=>location.hash='#/dashboard');
  $('#logoutBtn')?.addEventListener('click',()=>{localStorage.removeItem('jma_session');toast('Lokale Sitzung beendet.');render()});
  $('#videoInfo')?.addEventListener('click',()=>toast('Projektvorschau: Die Startseite ist echte programmierte UI; weitere Seiten werden routeweise fertiggestellt.'));
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
window.addEventListener('hashchange',render);if(!location.hash)history.replaceState(null,'','#/home');render();
