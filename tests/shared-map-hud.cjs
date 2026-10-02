// Composition, dialog lifecycle, shared pointer interaction and existing profile save transport.
// Isolated Auth fixture only; production requests are blocked.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/shared-map-hud');fs.mkdirSync(out,{recursive:true});
const cp=require('node:child_process');
let checks=0;const ok=(value,label)=>{assert.ok(value,label);console.log('PASS HUD',++checks,label)};
const fixture=fs.readFileSync(path.join(__dirname,'auth-fixture.js'),'utf8')+`\n(()=>{const factory=supabase.createClient;supabase.createClient=(...args)=>{const client=factory(...args),from=client.from.bind(client);client.from=table=>{
 if(table==='catalog_entries')return {select(){return this},order(){return this},range:async(start,end)=>({data:CATALOG_DATA.entries.slice(start,end+1).map(entry=>({id:entry.id,entry,revision:1})),error:null})};
 if(table==='user_roles')return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{user_id:'test-user-a',role:localStorage.getItem('composition-role')||'owner'},error:null})};
 return from(table)};return client}})();`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':decodeURIComponent(req.url.split('?')[0])));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(bytes)})});
const go=async(page,route,selector)=>{await page.evaluate(route=>location.hash='#/'+route,route);await page.waitForSelector(selector);await page.evaluate(()=>document.fonts.ready)};

(async()=>{await new Promise(resolve=>server.listen(4210,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'/tmp/once-human-chrome/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true}),errors=[];
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));
 await context.route('https://*.supabase.co/**',r=>r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:4210');await page.waitForFunction(()=>JMA_AUTH.getState().ready);await page.evaluate(()=>JMA_AUTH.signInWithPassword('preview@example.invalid','test-password'));
 const routes=['map','database','builds','tech-workbench','guides'];
 const selectors={map:'.lm-command-head',database:'.hud-hero',builds:'.hud-hero','tech-workbench':'.hud-hero',guides:'.hud-hero',profile:'.profile-ref-page',admin:'.admin-panel-page',settings:'.settings-page'};
 const visit=async route=>{await go(page,route,selectors[route]||'.rf-page');await page.waitForTimeout(40)};
 const geometry=async route=>page.locator(selectors[route]).evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left,right:r.right,top:r.top,height:r.height,radius:s.borderRadius,shadow:s.boxShadow}});
 const measurements=[];
 for(const width of [1920,1280,390,360]){
  await page.setViewportSize({width,height:width>820?1080:844});let reference;
  for(const route of routes){
   await visit(route);const shape=await geometry(route);if(!reference)reference=shape;
   for(const field of ['left','right','top','radius','shadow'])assert.equal(shape[field],reference[field],width+' '+route+' '+field);
   if(width>820)assert.equal(shape.height,reference.height);
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+route+' shared geometry and no horizontal overflow');
   if(route!=='map')ok(await page.locator('#app button:visible').evaluateAll(els=>els.every(e=>e.getBoundingClientRect().height>=44)),width+' '+route+' visible buttons have 44px height');
   measurements.push({width,route,...shape});
   if(width===1920||width===390)await page.screenshot({path:path.join(out,width+'-'+route+'.png')});
  }
 }
 await page.setViewportSize({width:1920,height:1080});
 await visit('settings');await page.click('[data-settings-theme="light"]');
 for(const route of routes.slice(1)){await visit(route);ok(await page.evaluate(()=>document.documentElement.dataset.uiTheme==='light')&&await page.locator('.hud-panel,.catalog-main').first().evaluate(e=>getComputedStyle(e).backgroundImage.includes('28, 42, 54')),route+' existing light-theme preference brightens shared panels');}
 await visit('settings');await page.click('[data-settings-theme="auto"]');await page.emulateMedia({colorScheme:'light'});await visit('guides');ok(await page.locator('body').evaluate(e=>getComputedStyle(e).filter)==='brightness(1.12)','Existing automatic light theme includes Guides');await page.emulateMedia({colorScheme:'dark'});
 await visit('settings');await page.click('[data-settings-theme="dark"]');
 await page.evaluate(()=>JMA_STORE.write('jma_profile_appearance',{color:'gold'}));
 const colors={magenta:'#cf48df',cyan:'#22d0e8',orange:'#ff7a18',violet:'#8454e8'};
 const rgb=hex=>'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';
 for(const [accent,hex]of Object.entries(colors)){
  await visit('settings');ok(await page.locator('.settings-scope-matrix article').count()===7&&await page.locator('.settings-scope-header b').textContent()==='7 Archivbereiche','Seven real routes shown in compact scope matrix');
  await page.click('[data-settings-accent="'+accent+'"]');
  for(const route of [...routes,'profile','admin']){
   await visit(route);
   ok(await page.evaluate(({route,accent,hex})=>document.body.dataset.uiPreferenceScope===route&&document.documentElement.dataset.uiAccent===accent&&getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim()===hex,{route,accent,hex}),accent+' enabled on '+route+' after navigation');
   if(route==='profile'){
    ok(await page.locator('.profile-ref-identity h1').evaluate(e=>getComputedStyle(e).color)===rgb('#edc775')&&await page.evaluate(()=>JMA_PROFILE.appearance().color==='gold'),accent+' interface accent preserves gold personal identity');
    ok(await page.locator('.profile-ref-tabs button.active').evaluate(e=>getComputedStyle(e).boxShadow).then(s=>s.includes(rgb(hex))),accent+' profile system selection uses interface accent');
   }else{
    const kicker=route==='admin'?'.admin-eyebrow':route==='map'?'.lm-kicker':'.hud-kicker';
    ok(await page.locator(kicker).first().evaluate(e=>getComputedStyle(e).color)===rgb(hex),accent+' visibly colors '+route+' kicker');
   }
   const active=page.locator('.main-nav a.active');if(await active.count())ok(await active.evaluate(e=>getComputedStyle(e).borderBottomColor)===rgb(hex),accent+' active global navigation follows scope on '+route);
  }
  await visit('profile');await page.reload();await page.waitForSelector('.profile-ref-page');
  ok(await page.evaluate(accent=>SETTINGS_PAGE.read().accent===accent&&document.documentElement.dataset.uiAccent===accent,accent),accent+' persists after complete route path and reload');
  for(const route of ['admin',...routes,'profile']){await visit(route);assert.equal(await page.evaluate(()=>document.documentElement.dataset.uiAccent),accent);assert.equal(await page.evaluate(()=>document.body.dataset.uiPreferenceScope),route)}
  ok(true,accent+' reload state applies to all seven routes');
  await visit(accent==='cyan'?'database':accent==='orange'?'builds':accent==='magenta'?'tech-workbench':'guides');await page.screenshot({path:path.join(out,'accent-'+accent+'.png')});
 }
 await visit('settings');await page.locator('#settingsRadius').fill('16');await page.locator('#settingsDensity').fill('100');await page.locator('label:has(#settingsSmooth)').click();await page.locator('label:has(#settingsFocus)').click();await page.locator('label:has(#settingsGrid)').click();await page.locator('label:has(#settingsCompact)').click();await page.selectOption('#settingsFont','System');
 for(const route of routes.slice(1)){
  await visit(route);
  ok((await geometry(route)).radius==='16px',route+' radius uses existing preference');
  const grid=page.locator(route==='database'?'.catalog-grid':route==='builds'?'.rf-build-slots':route==='guides'?'.rf-guide-grid':'.tw-card-grid');
  ok(await grid.evaluate(e=>getComputedStyle(e).gap)==='8px',route+' density uses existing preference');
  const card=page.locator('[data-liquid]').first();await card.focus();
  ok(await card.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(v=>parseFloat(v)===0)),route+' movement switch disables transitions');
  ok(await page.evaluate(()=>document.body.classList.contains('ui-bold-focus')&&document.body.classList.contains('ui-compact-settings')&&getComputedStyle(document.querySelector('#app')).backgroundImage==='none'),route+' existing focus, compactness and grid controls apply');
 }
 await visit('settings');await page.locator('label:has(#settingsSmooth)').click();await page.locator('label:has(#settingsFocus)').click();await page.locator('label:has(#settingsCompact)').click();await page.locator('#settingsRadius').fill('12');await page.locator('#settingsDensity').fill('58');
 // Existing functional binders, storage and validation are exercised without production transport.
 const count=k=>page.evaluate(k=>JMA_STORE.read(k,[]).length,k);
await visit('builds');await page.fill('#buildName','Kernfunktionsbuild');await page.selectOption('[data-build-slot="Primärwaffe"]',{index:1});await page.click('#buildSave');ok(await count('jma_saved_builds')===1,'Build save');ok(await page.locator('.rf-build-slots article').first().evaluate(e=>getComputedStyle(e).boxShadow.includes(getComputedStyle(e).getPropertyValue('--hud-accent').trim())||getComputedStyle(e).boxShadow.includes('inset')),'Existing chosen equipment receives restrained HUD state');const download=page.waitForEvent('download');await page.click('#buildShare');const file=await(await download).path();ok(JSON.parse(fs.readFileSync(file)).build.name==='Kernfunktionsbuild','Build JSON export');await page.setInputFiles('#buildImport',file);await page.waitForFunction(()=>JMA_STORE.read('jma_build_draft').id===null);ok(true,'Validated JSON import');await page.setInputFiles('#buildImport',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"name":"Bad","slots":{"Primärwaffe":"Invented"}}')});await page.waitForFunction(()=>document.querySelector('#buildMessage').textContent.includes('Unbekannter'));ok(true,'Reject unknown equipment');await page.click('[data-build-load]');ok(await page.inputValue('#buildName')==='Kernfunktionsbuild','Existing load control');
await visit('tech-workbench');await page.selectOption('#techTier','5');ok(await page.locator('.tw-card').count()===2,'Real tier filter');await page.locator('[data-tech-detail]').first().click();ok(await page.locator('#techDialog').isVisible(),'Tech detail');await page.locator('#techDialog button').click();await page.locator('[data-tech-seen]').first().click();ok(await count('jma_tech_seen')===1,'Analysis state');await page.click('[data-tech-tab="recipes"]');await page.fill('#recipeQty','3');await page.waitForFunction(()=>document.querySelector('.tw-recipe-materials em').textContent==='45');ok(true,'Verified recipe multiplier');await page.click('[data-tech-tab="invention"]');await page.locator('.tw-material-select').first().locator('summary').click();await page.click('[data-inv-slot="0"][data-inv-value="Metallschrott"]');await page.fill('#invName','Kernfunktionsmix');await page.click('#invSave');ok(await count('jma_invention_saved')===1,'Original material menu + saved mix');

 await page.click('[data-inv-load]');ok(await page.inputValue('#invName')==='Kernfunktionsmix','Saved invention reloads existing mix');
 await page.click('[data-tech-tab="reverse"]');await page.selectOption('#techTier','all');await page.fill('#techSearch','Chaosium');await page.waitForTimeout(350);ok(await page.locator('.tw-card').count()===1,'Tech search retains existing behavior');
 await page.click('[data-tech-view="list"]');ok(await page.locator('.tw-card-grid.list').count()===1,'Existing tech list view retained');
 await visit('guides');await page.fill('#guideSearch','Funktionsguides-no-match');await page.waitForTimeout(350);ok(await page.locator('.rf-guide-grid>article').count()===0,'Guides search remains functional');await page.fill('#guideSearch','');await page.waitForTimeout(350);const category=await page.locator('#guideCategory option').nth(1).evaluate(e=>e.value);await page.selectOption('#guideCategory',category);ok(await page.locator('.rf-guide-grid>article').count()===await page.evaluate(cat=>ARCHIVE_DATA.guides.guides.filter(g=>g.category===cat).length,category)&&await page.locator('[data-tutorial-start]').count()===1,'Guide category filter retains original rows and pilot');
 await page.locator('[data-guide-toggle]').click();ok(await page.locator('.rf-guide-chapters:visible section').count()===5,'Five original pilot chapters open');await page.locator('[data-guide-toggle]').click();
 await page.locator('[data-tutorial-start]').click();await page.waitForSelector('.rf-tutorial');await page.evaluate(()=>{globalThis.hudPilot=document.querySelector('.rf-tutorial');globalThis.hudCompanion=document.querySelector('.rf-tutorial-companion')});await page.click('[data-tutorial-next]');await page.evaluate(()=>JMA_RENDER());
 ok(await page.evaluate(()=>JMA_TUTORIAL.getState().stepIndex===1&&document.querySelector('.rf-tutorial')===hudPilot&&document.querySelector('.rf-tutorial-companion')===hudCompanion),'Existing tutorial session and companion survive step/render');await page.keyboard.press('Escape');
 for(const route of routes.slice(1)){
  await visit(route);const card=page.locator(route==='database'?'.catalog-card':route==='builds'?'.rf-build-slots>article':route==='guides'?'.rf-guide-grid>article':'.tw-card').first();
  await card.scrollIntoViewIfNeeded();const rect=await card.boundingBox();await page.mouse.move(rect.x+rect.width*.25,rect.y+rect.height*.25);await page.waitForTimeout(50);
  ok(await card.evaluate(e=>parseFloat(e.style.getPropertyValue('--px'))<40&&e.style.getPropertyValue('--rx')!==''),route+' reuses shared pointer binder');
  const one=await card.evaluate(e=>{ADMIN_PANEL.bindLiquidCards(document);ADMIN_PANEL.bindLiquidCards(document);const raf=requestAnimationFrame;let n=0;window.requestAnimationFrame=fn=>{n++;return raf(fn)};const r=e.getBoundingClientRect();e.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:r.x+10,clientY:r.y+10,bubbles:false}));window.requestAnimationFrame=raf;return n});ok(one===1,route+' binder remains idempotent');
  await page.emulateMedia({reducedMotion:'reduce'});ok(await card.evaluate(e=>getComputedStyle(e).transform)==='none',route+' reduced motion suppresses tilt');await page.emulateMedia({reducedMotion:'no-preference'});
 }
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await touch.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));await touch.route('https://*.supabase.co/**',r=>r.abort());const mobile=await touch.newPage();await mobile.goto('http://127.0.0.1:4210');await mobile.waitForFunction(()=>JMA_AUTH.getState().ready);await mobile.evaluate(()=>JMA_AUTH.signInWithPassword('preview@example.invalid','test-password'));
 for(const route of routes.slice(1)){await go(mobile,route,selectors[route]);const card=mobile.locator(route==='database'?'.catalog-card':route==='builds'?'.rf-build-slots>article':route==='guides'?'.rf-guide-grid>article':'.tw-card').first();await card.evaluate(e=>e.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:20,clientY:20})));ok(await card.evaluate(e=>getComputedStyle(e).transform==='none'&&e.style.getPropertyValue('--rx')==='0deg'),route+' actual touch context has no forced tilt');}
 await go(mobile,'tech-workbench','.hud-hero');await mobile.locator('[data-tech-detail]').first().click();ok(await mobile.locator('#techDialog .dialog-close').evaluate(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44),'390px existing tech detail close has a 44px target');ok(await mobile.locator('#techDialog').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),'390px existing tech dialog fits viewport');await mobile.locator('#techDialog .dialog-close').click();
 for(const tab of ['invention','recipes']){await mobile.click('[data-tech-tab="'+tab+'"]');ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px '+tab+' workspace has no horizontal overflow');ok(await mobile.locator('.hud-page button:visible,.hud-page .tw-material-select summary').evaluateAll(els=>els.every(e=>e.getBoundingClientRect().height>=44)),'390px '+tab+' controls preserve touch height');await mobile.screenshot({path:path.join(out,'390-tech-'+tab+'.png')});await mobile.locator(tab==='invention'?'.tw-invention-stage':'.tw-recipe-showcase').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-72,behavior:'instant'}));await mobile.screenshot({path:path.join(out,'390-tech-'+tab+'-workspace.png')});await mobile.evaluate(()=>scrollTo({top:0,behavior:'instant'}));}
 await touch.close();
 // Compare noncommissioned RF routes against the exact baseline files in a second local context.
 const baseline=await browser.newContext({viewport:{width:1920,height:1080}});await baseline.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));await baseline.route('https://*.supabase.co/**',r=>r.abort());
 for(const file of ['app.js','routes-full.js','styles.css','routes-full.css','live-map.css','settings-page.js','settings-page.css','admin-panel.css','site-header.css'])await baseline.route('**/'+file+'*',r=>r.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:cp.execFileSync('git',['show','6950f26:'+file],{cwd:root,encoding:'utf8'})}));
 const old=await baseline.newPage();await old.goto('http://127.0.0.1:4210');await old.waitForFunction(()=>JMA_AUTH.getState().ready);await old.evaluate(()=>JMA_AUTH.signInWithPassword('preview@example.invalid','test-password'));
 const snapshot=p=>p.locator('.rf-hero').evaluate(el=>[el,...el.querySelectorAll('h1,p,aside')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height,color:s.color,bg:s.backgroundImage,radius:s.borderRadius}}));
 for(const route of ['community','planner','patchwatch']){await visit(route);await go(old,route,'.rf-hero');assert.deepEqual(await snapshot(page),await snapshot(old));ok(true,route+' generic hero remains identical to baseline');}
 await baseline.close();
 ok(errors.length===0,'No browser exceptions: '+errors.join('; '));fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(measurements,null,2));console.log('PASS shared map HUD checks:',checks);
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
