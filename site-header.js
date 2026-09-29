/* Shared site shell: mounted once before route rendering. */
(()=>{
 const host=document.getElementById("siteHeader");
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
          <a href="#/profile" data-account-menu-link>Profil</a>
          <button type="button" id="headerLogout">Abmelden</button>
        </div>
      </div>
      <button class="menu-toggle" id="menuToggle" type="button" aria-label="Menü öffnen">☰</button>
    </div>
  </header>`;
})();
