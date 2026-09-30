(()=>{'use strict';
const KEY='jma_ui_preferences';
const DEFAULTS={theme:'dark',accent:'coral',density:58,font:'SF Pro',radius:12,smooth:true,focus:false,grid:true,compact:false};
const ACCENTS={
  blue:'#238cff',green:'#1fcf97',yellow:'#ffd02e',orange:'#ff7a18',red:'#ff3349',
  magenta:'#cf48df',violet:'#8454e8',cyan:'#22d0e8',coral:'#ff7d73'
};
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function read(){
  let value={};
  try{value=globalThis.JMA_STORE?.read?.(KEY,{})||JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  return {...DEFAULTS,...value,density:clamp(value.density??DEFAULTS.density,0,100),radius:clamp(value.radius??DEFAULTS.radius,4,16)};
}
function write(value){
  const next={...read(),...value};
  if(globalThis.JMA_STORE?.write) globalThis.JMA_STORE.write(KEY,next);
  else localStorage.setItem(KEY,JSON.stringify(next));
  apply(next);
  return next;
}
function apply(p=read()){
  const root=document.documentElement,body=document.body;
  const accent=ACCENTS[p.accent]||ACCENTS.coral;
  root.dataset.uiTheme=p.theme;
  root.dataset.uiAccent=p.accent;
  root.style.setProperty('--ui-accent',accent);
  root.style.setProperty('--ui-accent-soft',accent+'33');
  root.style.setProperty('--ui-radius',p.radius+'px');
  root.style.setProperty('--ui-density',String(p.density/100));
  root.style.setProperty('--ui-font',p.font==='System'?'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif':p.font==='Inter'?'Inter,system-ui,sans-serif':'"SF Pro Display","SF Pro Text",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif');
  if(body){
    body.classList.toggle('ui-smooth',!!p.smooth);
    body.classList.toggle('ui-bold-focus',!!p.focus);
    body.classList.toggle('ui-show-grid',!!p.grid);
    body.classList.toggle('ui-compact-settings',!!p.compact);
  }
}
function sidebarIcon(type){
  const icons={
    profile:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21c.7-4.3 3-6.5 7-6.5s6.3 2.2 7 6.5"/>',
    team:'<circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.4"/><path d="M2.5 20c.6-4 2.4-6 5.5-6s5 2 5.5 6M14 14c3.2 0 5.3 1.8 5.8 5"/>',
    alerts:'<path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3z"/><path d="M10 20h4"/>',
    security:'<path d="M12 3 19 6v5c0 5-2.8 8.1-7 10-4.2-1.9-7-5-7-10V6z"/><path d="M12 8v5m0 3h.01"/>',
    themes:'<path d="M12 3a9 9 0 1 0 0 18h1.2a2.2 2.2 0 0 0 0-4.4h-.8a1.7 1.7 0 0 1 0-3.4H16A5 5 0 0 0 21 8c0-3-3.7-5-9-5Z"/><circle cx="7.5" cy="9" r=".8"/><circle cx="10" cy="6.5" r=".8"/><circle cx="14" cy="6.3" r=".8"/>',
    links:'<path d="M10 14 14 10M8.5 16.5l-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M15.5 7.5l1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0"/>',
    sub:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    shortcuts:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h2m3 0h2m3 0h1M7 13h2m3 0h2m3 0h1M7 17h7"/>',
    dev:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 9-3 3 3 3m5 0h5"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+(icons[type]||icons.profile)+'</svg>';
}
function swatches(active){
  return Object.entries(ACCENTS).map(([id,color])=>'<button class="settings-swatch '+(active===id?'active':'')+'" data-settings-accent="'+id+'" type="button" aria-label="'+id+'" aria-pressed="'+String(active===id)+'" style="--swatch:'+color+'"><span></span></button>').join('');
}
function toggle(id,label,copy,checked){
  return '<label class="settings-toggle-row"><span class="settings-switch"><input id="'+id+'" type="checkbox" '+(checked?'checked':'')+'><i></i></span><span><b>'+safe(label)+'</b><small>'+safe(copy)+'</small></span></label>';
}
function routePreview(src,title){
  return '<article class="settings-preview-card"><div class="settings-preview-art" style="--preview:url(\''+src+'\')"></div><div><b>'+safe(title)+'</b><span>Archivbereich</span></div><i aria-hidden="true">•••</i></article>';
}
function renderSettings(){
  const p=read(),a=globalThis.JMA_AUTH?.getAccount?.()||{},name=a.name||a.email||'Meta-Human';
  return '<section class="settings-page" aria-labelledby="settingsTitle">'+
    '<div class="settings-backdrop" aria-hidden="true"></div>'+
    '<div class="settings-window">'+
      '<aside class="settings-sidebar">'+
        '<div class="settings-user-mini"><span>'+safe(String(name).trim().charAt(0).toUpperCase()||'M')+'</span><div><b>'+safe(name)+'</b><small>Einstellungen</small></div></div>'+
        '<nav aria-label="Einstellungsbereiche">'+
          '<a href="#/profile">'+sidebarIcon('profile')+'<span>Profil</span><em>1</em></a>'+
          '<button type="button" disabled>'+sidebarIcon('team')+'<span>Team</span><em>5</em></button>'+
          '<button type="button" disabled>'+sidebarIcon('alerts')+'<span>Benachrichtigungen</span><em>3</em></button>'+
          '<a href="#/profile">'+sidebarIcon('security')+'<span>Sicherheit</span></a>'+
          '<button class="active" type="button" aria-current="page">'+sidebarIcon('themes')+'<span>Themes</span></button>'+
          '<button type="button" disabled>'+sidebarIcon('links')+'<span>Verbindungen</span><em>2</em></button>'+
          '<button type="button" disabled>'+sidebarIcon('sub')+'<span>Abonnement</span></button>'+
          '<button type="button" disabled>'+sidebarIcon('shortcuts')+'<span>Shortcuts</span></button>'+
          '<button type="button" disabled>'+sidebarIcon('dev')+'<span>Entwickler Tools</span></button>'+
        '</nav>'+
      '</aside>'+
      '<main class="settings-content">'+
        '<section class="settings-controls">'+
          '<header class="settings-titlebar"><div class="settings-title-icon">'+sidebarIcon('themes')+'</div><div><h1 id="settingsTitle">Themes</h1><p>Passe die visuelle Oberfläche deines Archivs an.</p></div></header>'+
          '<div class="settings-segment" role="group" aria-label="Farbschema">'+
            ['auto','light','dark'].map(v=>'<button type="button" data-settings-theme="'+v+'" class="'+(p.theme===v?'active':'')+'">'+({auto:'Auto',light:'Hell',dark:'Dunkel'}[v])+'</button>').join('')+
          '</div>'+
          '<section class="settings-field"><label>Akzentfarbe</label><div class="settings-swatches">'+swatches(p.accent)+'</div><div class="settings-accent-name" id="settingsAccentName">'+safe(p.accent.charAt(0).toUpperCase()+p.accent.slice(1))+'</div></section>'+
          '<section class="settings-field"><label for="settingsDensity">Dichte</label><input id="settingsDensity" class="settings-range" type="range" min="0" max="100" value="'+p.density+'"><div class="settings-range-labels"><span>Locker</span><span>Standard</span><span>Kompakt</span></div></section>'+
          '<section class="settings-field"><label for="settingsFont">Schriftart</label><select id="settingsFont"><option '+(p.font==='SF Pro'?'selected':'')+'>SF Pro</option><option '+(p.font==='Inter'?'selected':'')+'>Inter</option><option '+(p.font==='System'?'selected':'')+'>System</option></select></section>'+
          '<section class="settings-field"><label for="settingsRadius">Eckenradius</label><input id="settingsRadius" class="settings-range radius" type="range" min="4" max="16" step="1" value="'+p.radius+'"><div class="settings-range-labels"><span>4</span><span>8</span><span>12</span><span>16</span></div></section>'+
          '<div class="settings-toggles">'+
            toggle('settingsSmooth','Weiche Animationen','Flüssige Übergänge für Designelemente.',p.smooth)+
            toggle('settingsFocus','Starke Fokus-Ringe','Deutlichere Tastaturfokussierung.',p.focus)+
            toggle('settingsGrid','Rasterlinien anzeigen','Feine Hilfslinien in der Designvorschau.',p.grid)+
            toggle('settingsCompact','Kompakte Sidebar-Icons','Reduziert die Navigation auf engere Abstände.',p.compact)+
          '</div>'+
        '</section>'+
        '<section class="settings-live-preview" aria-label="Live-Vorschau">'+
          '<header><label><span>⌕</span><input aria-label="Vorschau durchsuchen" placeholder="Designs, Assets, Items suchen …"></label><button class="settings-preview-primary" type="button" disabled>Neue Ansicht</button><button type="button" disabled>Zusammenarbeiten</button></header>'+
          '<div class="settings-preview-head"><b>Vorschau</b><span>Aktueller Archivstil</span></div>'+
          '<div class="settings-preview-grid">'+
            routePreview('./assets/reference/news-hero.webp','Startseite')+
            routePreview('./assets/reference/feature-map.webp','Karte')+
            routePreview('./assets/reference/showcase-items.webp','Techwerkbank')+
            routePreview('./assets/reference/feature-community.webp','Community')+
            routePreview('./assets/reference/feature-builds.webp','Profil')+
            routePreview('./assets/reference/showcase-weapons.webp','Datenbank')+
          '</div>'+
          '<div class="settings-editor-preview">'+
            '<aside><small>Layer</small><div class="active"><span>⌄</span><b>Theme</b><i>◉</i></div><div><span>⌁</span><b>Hintergrund</b><i>◉</i></div><div><span>›</span><b>Navigation</b><i>◉</i></div><div><span>›</span><b>Kartenbereich</b><i>◉</i></div><div><span>›</span><b>UI Elemente</b><i>◉</i></div></aside>'+
            '<div class="settings-timeline"><div class="timeline-scale"><span>0</span><span>4</span><span>8</span><span>12</span><span>16</span><span>20</span></div><div class="timeline-row"><i style="--x:0%;--w:62%"></i></div><div class="timeline-row"><i style="--x:28%;--w:48%"></i></div><div class="timeline-row"><i style="--x:48%;--w:34%"></i></div><div class="timeline-row"><i style="--x:70%;--w:28%"></i></div><span class="timeline-playhead"></span></div>'+
          '</div>'+
        '</section>'+
      '</main>'+
      '<div class="settings-updated" id="settingsUpdated" role="status" aria-live="polite"><span>✓</span><div><b>Theme aktualisiert</b><small>Deine Einstellungen wurden gespeichert.</small></div></div>'+
    '</div>'+
  '</section>';
}
function bindSettings(){
  apply();
  const flash=()=>{const el=q('#settingsUpdated');if(!el)return;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(flash.timer);flash.timer=setTimeout(()=>el.classList.remove('show'),2200)};
  qa('[data-settings-theme]').forEach(btn=>btn.onclick=()=>{write({theme:btn.dataset.settingsTheme});qa('[data-settings-theme]').forEach(x=>x.classList.toggle('active',x===btn));flash()});
  qa('[data-settings-accent]').forEach(btn=>btn.onclick=()=>{const accent=btn.dataset.settingsAccent;write({accent});qa('[data-settings-accent]').forEach(x=>{const active=x===btn;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});const n=q('#settingsAccentName');if(n)n.textContent=accent.charAt(0).toUpperCase()+accent.slice(1);flash()});
  q('#settingsDensity')?.addEventListener('input',e=>write({density:+e.target.value}));
  q('#settingsDensity')?.addEventListener('change',flash);
  q('#settingsRadius')?.addEventListener('input',e=>write({radius:+e.target.value}));
  q('#settingsRadius')?.addEventListener('change',flash);
  q('#settingsFont')?.addEventListener('change',e=>{write({font:e.target.value});flash()});
  [['#settingsSmooth','smooth'],['#settingsFocus','focus'],['#settingsGrid','grid'],['#settingsCompact','compact']].forEach(([sel,key])=>q(sel)?.addEventListener('change',e=>{write({[key]:e.target.checked});flash()}));
}
apply(read());
globalThis.SETTINGS_PAGE={render:renderSettings,bind:bindSettings,read,apply};
globalThis.FULL_ROUTE_RENDERERS=globalThis.FULL_ROUTE_RENDERERS||{};
globalThis.FULL_ROUTE_BINDERS=globalThis.FULL_ROUTE_BINDERS||{};
globalThis.FULL_ROUTE_RENDERERS.settings=renderSettings;
globalThis.FULL_ROUTE_BINDERS.settings=bindSettings;
})();