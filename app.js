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
  app.innerHTML=route.id==='home'?renderHome():renderDevelopment(route);
  bindView(); window.scrollTo({top:0,behavior:'instant'}); app.focus({preventScroll:true});
}
function bindView(){
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
function renderSearch(q){q=q.trim().toLowerCase();const rows=ROUTES.filter(r=>!q||`${r.label} ${r.purpose} ${r.id}`.toLowerCase().includes(q));$('#searchResults').innerHTML=rows.map(r=>`<a class="search-result" href="#/${r.id}"><span><b>${escapeHtml(r.label)}</b><small>${escapeHtml(r.purpose)}</small></span><span>${r.icon} →</span></a>`).join('')||'<div class="dev-notice">Keine passende Route gefunden.</div>';$('#searchResults').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('#searchDialog').close()))}
$('#searchTrigger').addEventListener('click',openSearch);$('#searchClose').addEventListener('click',()=>$('#searchDialog').close());$('#globalSearch').addEventListener('input',e=>renderSearch(e.target.value));
$('#newsletterForm').addEventListener('submit',e=>{e.preventDefault();localStorage.setItem('jma_newsletter',$('#newsletterEmail').value.trim());$('#newsletterStatus').textContent='Für diese lokale Demo gespeichert.';toast('Newsletter-Adresse lokal gespeichert.');});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
window.addEventListener('hashchange',render);if(!location.hash)history.replaceState(null,'','#/home');render();
