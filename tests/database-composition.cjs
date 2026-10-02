// Composition, dialog lifecycle, shared pointer interaction and existing profile save transport.
// Isolated Auth fixture only; production requests are blocked.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/database-composition');fs.mkdirSync(out,{recursive:true});
let checks=0;const ok=(value,label)=>{assert.ok(value,label);console.log('PASS COMPOSITION',++checks,label)};
const fixture=fs.readFileSync(path.join(__dirname,'auth-fixture.js'),'utf8')+`\n(()=>{const factory=supabase.createClient;supabase.createClient=(...args)=>{const client=factory(...args),from=client.from.bind(client);client.from=table=>{
 if(table==='catalog_entries')return {select(){return this},order(){return this},range:async(start,end)=>({data:CATALOG_DATA.entries.slice(start,end+1).map(entry=>({id:entry.id,entry,revision:1})),error:null})};
 if(table==='user_roles')return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{user_id:'test-user-a',role:localStorage.getItem('composition-role')||'owner'},error:null})};
 return from(table)};return client}})();`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':decodeURIComponent(req.url.split('?')[0])));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(bytes)})});
const go=async(page,route,selector)=>{await page.evaluate(route=>location.hash='#/'+route,route);await page.waitForSelector(selector);await page.evaluate(()=>document.fonts.ready)};
(async()=>{await new Promise(resolve=>server.listen(4208,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:'/tmp/once-human-chrome/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}}),errors=[],network=[];
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));
 await context.route('https://*.supabase.co/**',r=>{network.push(r.request().url());return r.abort()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4208/#/home');await page.waitForFunction(()=>JMA_AUTH.getState().ready);await page.evaluate(()=>JMA_AUTH.signInWithPassword('preview@example.invalid','test-password'));
 const geometry=async(selector)=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,radius:s.borderRadius,shadow:s.boxShadow}});
 for(const width of [1920,1840,1280,768,390]){
  await page.setViewportSize({width,height:width===390?844:1080});await go(page,'profile','.profile-ref-banner');const profile=await geometry('.profile-ref-banner');
  await go(page,'database','.database-hero');const database=await geometry('.database-hero');assert.deepEqual(database,profile);
  ok(true,width+' profile/database banner edges, height, radius and shadow match');
  ok(await page.locator('.database-metrics>*').count()===4,width+' four independent status modules');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' composition has no horizontal overflow');
 }
 await page.setViewportSize({width:1920,height:1080});await go(page,'database','#catalogSearch');
 ok(await page.locator('#catalogDossier,.catalog-dossier').count()===0,'No permanent or parallel dossier DOM');
 await page.locator('.catalog-card').first().hover();ok(!await page.locator('#catalogDialog').isVisible(),'Hover never opens detail');
 const card=page.locator('.catalog-card').first();await card.scrollIntoViewIfNeeded();const rect=await card.boundingBox();await page.mouse.move(rect.x+rect.width*.2,rect.y+rect.height*.3);await page.waitForTimeout(80);
 ok(await card.evaluate(e=>parseFloat(e.style.getPropertyValue('--px'))<40&&getComputedStyle(e).transform!=='none'),'Shared pointer shine and perspective respond on a catalog card');
 await page.mouse.move(0,0);await page.waitForTimeout(80);ok(await card.evaluate(e=>e.style.getPropertyValue('--rx')==='0deg'&&e.style.getPropertyValue('--glow')==='.18'),'Pointerleave resets tilt and glow');
 const frames=await page.evaluate(()=>{const card=document.querySelector('.catalog-card');ADMIN_PANEL.bindLiquidCards(document);ADMIN_PANEL.bindLiquidCards(document);const raf=window.requestAnimationFrame;let calls=0;window.requestAnimationFrame=fn=>{calls++;return raf(fn)};card.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:card.getBoundingClientRect().x+50,clientY:card.getBoundingClientRect().y+50}));window.requestAnimationFrame=raf;return calls});ok(frames===1,'Repeated shared binding keeps one pointer handler');
 await page.locator('#catalogSearch').fill('cat-tier-fuchs');await page.locator('.catalog-card').scrollIntoViewIfNeeded();
 await page.evaluate(()=>window.scrollBy({top:60,behavior:'instant'}));const scrollBefore=await page.evaluate(()=>scrollY),filterBefore=await page.inputValue('#catalogSearch');
 await page.locator('.catalog-card h3 button').click();const dialog=page.locator('#catalogDialog');
 ok(await dialog.isVisible(),'Name click opens the sole detail dialog');
 ok(await dialog.locator('.catalog-detail-body .catalog-detail-category').count()===1,'Category metadata belongs beside name and type in the information column');
 ok(await dialog.locator('.catalog-detail-footer').evaluate(e=>e.getBoundingClientRect().width===e.closest('dialog').clientWidth),'Dossier action footer spans both desktop columns');
 ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.width===960&&Math.abs(r.x+r.width/2-innerWidth/2)<1&&Math.abs(r.y+r.height/2-innerHeight/2)<1}),'960px detail modal is centered in both axes');
 await page.evaluate(()=>window.testDetail=document.querySelector('#catalogDialog'));await dialog.locator('[data-db-fav]').click();
 ok(await page.evaluate(()=>document.querySelector('#catalogDialog')===testDetail&&testDetail.open),'Collection toggle preserves open dialog instance');
 await dialog.locator('[data-db-hunt]').click();await dialog.locator('[data-db-found]').click();ok(await page.locator('#catalogHuntCount').textContent()==='1'&&await page.locator('#catalogFoundCount').textContent()==='1','Dossier hunt/found actions update the actual status counters');
 await page.keyboard.press('Escape');ok(!await dialog.isVisible()&&await page.inputValue('#catalogSearch')===filterBefore&&await page.evaluate(()=>scrollY)===scrollBefore,'Escape restores exact scroll and filter position');
 for(const selector of ['.catalog-card-art','.catalog-excerpt','.catalog-actions [data-db-detail]']){
  await page.locator(selector).click();ok(await dialog.isVisible(),selector+' click opens dossier');await dialog.locator('[data-db-close]').click();
 }
 await page.locator('.catalog-card-art').click();await page.mouse.click(5,5);ok(!await dialog.isVisible(),'Backdrop click closes the centered dialog');
 await page.locator('.catalog-card-art').click();await dialog.locator('[data-db-edit]').click();
 ok(!await dialog.isVisible()&&await page.locator('#catalogEditorDialog').isVisible(),'Authorized detail edit opens the existing editor without parallel detail modal');
 ok(await page.locator('#catalogEditorDialog').evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<1&&Math.abs(r.y+r.height/2-innerHeight/2)<1}),'Shared editor is centered');await page.keyboard.press('Escape');
 await page.locator('[data-db-mode]').click();await page.locator('[data-db-add]').click();ok(await page.locator('#catalogEditorDialog').getAttribute('aria-label')==='Katalogeintrag hinzufügen','Add uses the same centered editor in create mode');await page.keyboard.press('Escape');
 await go(page,'admin','.admin-panel-page');await page.locator('[data-admin-view="system"]').click();await page.waitForSelector('.admin-system-list');const system=page.locator('.admin-system-list>span').first();await system.scrollIntoViewIfNeeded();const systemRect=await system.boundingBox();await page.mouse.move(systemRect.x+systemRect.width*.2,systemRect.y+systemRect.height*.2);await page.waitForTimeout(80);ok(await system.evaluate(e=>parseFloat(e.style.getPropertyValue('--rx'))>0),'Admin system cards still use the same working pointer helper');await page.mouse.move(0,0);
 // Color roundtrips through the existing profiles update + Auth archive_appearance transport.
 const colors={cyan:'#45e3f1',red:'#ff3d5e',gold:'#edc775',violet:'#b89bf8'},globalCyan=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cyan'));
 await go(page,'settings/profile','[data-profile-live]');await page.locator('[data-profile-edit-tab="about"]').click();await page.locator('#profileBio').fill('Preserved profile identity');await page.locator('[data-profile-edit-tab="banner"]').click();await page.locator('[data-profile-choice="banner"][data-value="eisfront"]').click();
 let savedOther;
 for(const [id,color] of Object.entries(colors)){
  await page.locator('[data-profile-edit-tab="colors"]').click();await page.locator('[data-profile-choice="color"][data-value="'+id+'"]').click();
  const rgb='rgb('+color.slice(1).match(/../g).map(x=>parseInt(x,16)).join(', ')+')';
  ok(await page.locator('[data-profile-live-name]').evaluate(e=>getComputedStyle(e).color)===rgb,id+' live preview name visibly follows selected preset');
  await page.locator('[data-profile-edit-panel="colors"] [data-profile-save]').click();await page.waitForFunction(id=>JSON.parse(localStorage.getItem('test:user'))?.user_metadata?.archive_appearance?.color===id,id);
  const metadata=await page.evaluate(()=>JSON.parse(localStorage.getItem('test:user')).user_metadata.archive_appearance);const {color:ignored,...other}=metadata;if(savedOther)assert.deepEqual(other,savedOther);savedOther=other;
  ok(metadata.banner==='eisfront'&&metadata.bio==='Preserved profile identity',id+' existing Supabase transport persists color without changing other appearance data');
  await page.evaluate(()=>JMA_STORE.remove('jma_profile_appearance'));await page.reload();await page.waitForSelector('[data-profile-live]');ok(await page.evaluate(()=>JMA_PROFILE.appearance().color)===id,id+' restored Auth session retains preset without local appearance fallback');
  await go(page,'profile','.profile-ref-banner');ok(await page.locator('.profile-ref-identity h1').evaluate(e=>getComputedStyle(e).color)===rgb,id+' main profile matches persisted preset with a custom banner');
  ok(await page.locator('.profile-ref-progress em').evaluate((e,rgb)=>getComputedStyle(e).backgroundImage.includes(rgb),rgb)&&await page.locator('.profile-ref-avatar').evaluate(e=>getComputedStyle(e,'::before').backgroundColor)===rgb,id+' progress and personal avatar accent also match');
  ok(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cyan'))===globalCyan,id+' leaves global website system colors untouched');await go(page,'settings/profile','[data-profile-live]');
 }
 await go(page,'database','#catalogSearch');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.catalog-card').first().hover();await page.waitForTimeout(80);ok(await page.locator('.catalog-card').first().evaluate(e=>getComputedStyle(e).transform)==='none','Reduced motion suppresses catalog tilt/lift');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForSelector('.catalog-card');await page.locator('.catalog-card-art').first().click();ok(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'390px dossier remains inside the viewport');
 await dialog.locator('.catalog-detail-actions').scrollIntoViewIfNeeded();ok(await dialog.locator('.catalog-detail-actions button').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)),'390px dossier collection actions retain 44px touch height');await page.keyboard.press('Escape');
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await touch.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));await touch.route('https://*.supabase.co/**',r=>r.abort());const tp=await touch.newPage();await tp.goto('http://127.0.0.1:4208/#/home');await tp.waitForFunction(()=>JMA_AUTH.getState().ready);await tp.evaluate(()=>JMA_AUTH.signInWithPassword('preview@example.invalid','test-password'));await go(tp,'database','.catalog-card');await tp.locator('.catalog-card').first().evaluate(e=>e.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:20,clientY:20})));ok(await tp.locator('.catalog-card').first().evaluate(e=>getComputedStyle(e).transform)==='none','Touch never forces perspective tilt');await tp.locator('.catalog-card-art').first().tap();ok(await tp.locator('#catalogDialog').isVisible(),'Touch tap opens dossier');await touch.close();
 ok(network.length===0,'No production requests or writes during composition/profile checks');ok(errors.length===0,'No browser exceptions: '+errors.join('; '));await context.close();console.log('PASS composition checks:',checks);
}finally{await browser.close();server.close()}})().catch(error=>{console.error(error);server.close();process.exitCode=1});
