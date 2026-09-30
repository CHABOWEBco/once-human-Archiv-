/* Shared site shell: mounted once before route rendering. */
(()=>{
 const host=document.getElementById("siteHeader");
 const paths={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',database:'M4 4h16v16H4zM4 9h16M9 9v11',map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',builds:'m4 20 10-10M13 4l7 7M12 5l3-3 7 7-3 3M3 17l4 4', 'tech-workbench':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',community:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-3a8 8 0 0 1 16 0v3',guides:'M12 6Q7 2 3 4v16q5-2 9 1 4-3 9-1V4q-4-2-9 2zM12 6v15'};
 window.SITE_HEADER={icon:id=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]||paths.database}"/></svg>`};
 host.outerHTML=`<header class="topbar" id="topbar">
    <a class="brand" href="#/home" aria-label="Once Human Archiv Startseite">
      <span class="brand-mark home-logo-mark"><img class="home-brand-logo" src="./assets/branding/once-human-logo.png" alt=""></span>
      <span><strong>ONCE HUMAN</strong><small>ARCHIV</small></span>
    </a>
    <nav class="main-nav" id="mainNav" aria-label="Hauptnavigation"></nav>
    <div class="top-actions">
      <button class="search-trigger" id="searchTrigger" type="button" aria-label="Suche öffnen"><span>⌕</span><em>Suche nach Waffen, Items, Gebieten, Builds …</em></button>
      <button class="ghost-btn" id="loginOpen" type="button">Anmelden</button>
      <button class="cyan-btn compact" id="registerOpen" type="button">Registrieren</button>
      <div class="header-account" id="headerAccount" hidden>
        <button class="header-account-trigger" id="headerAccountTrigger" type="button" aria-haspopup="true" aria-expanded="false">
          <span class="header-account-avatar" id="headerAccountAvatar">M</span>
          <span class="header-account-copy"><strong id="headerAccountName">Meta-Human</strong><small id="headerAccountStatus">ANGEMELDET</small></span>
          <span class="header-account-chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="header-account-menu" id="headerAccountMenu" hidden>
          <small class="header-account-email" id="headerAccountEmail"></small>
          <a href="#/dashboard" data-account-menu-link>Kommandozentrale</a>
          <a href="#/profile" data-account-menu-link>Profil</a>\n          <a href="#/settings" data-account-menu-link>Einstellungen</a>
          <button type="button" id="headerLogout">Abmelden</button>
        </div>
      </div>
      <button class="menu-toggle" id="menuToggle" type="button" aria-label="Menü öffnen">☰</button>
    </div>
  </header>`;
})();
