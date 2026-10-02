// Real mouse/touch regression of the single canonical Live Map controller.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/map-desktop'),baseline='4eb271358d62d52bced193df14d0dfbbb8881365';
fs.mkdirSync(out,{recursive:true});let checks=0;const results=[];
const ok=(value,name)=>{assert.ok(value,name);results.push(name);console.log('PASS',++checks,name)};
const fixture=fs.readFileSync(path.join(__dirname,'auth-fixture.js'),'utf8').replace("role:'user'","role:'owner'")+`\n(()=>{const f=supabase.createClient;supabase.createClient=(...a)=>{const c=f(...a),from=c.from.bind(c);c.from=t=>t!=='catalog_entries'?from(t):{select(){return this},order(){return this},range:async(a,b)=>({data:CATALOG_DATA.entries.slice(a,b+1).map(entry=>({id:entry.id,entry,revision:1})),error:null})};return c}})();`;
const oldFile=name=>cp.execFileSync('git',['show',baseline+':'+name],{cwd:root,encoding:'utf8'});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(bytes)})});
const errors=[],metrics={};
(async()=>{
 await new Promise(r=>server.listen(4211,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/tmp/once-human-chrome/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 try{
  const create=async(width,touch=false,original=false)=>{
   const context=await browser.newContext({viewport:{width,height:touch?844:1080},hasTouch:touch,reducedMotion:'reduce'});
   await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));
   await context.route('https://*.supabase.co/**',r=>r.abort());

   if(original)for(const name of ['live-map.js','live-map.css'])await context.route('**/'+name+'?*',r=>r.fulfill({contentType:name.endsWith('js')?'text/javascript':'text/css',body:oldFile(name)}));
   await context.addInitScript(()=>{
    window.__mapStats={pending:new Set(),max:0,frames:0,writes:[],ghosts:0,observers:new Set()};
    const NativeResize=window.ResizeObserver;window.ResizeObserver=class extends NativeResize{observe(el,options){if(el.id==='lmBoard')__mapStats.observers.add(this);return super.observe(el,options)}disconnect(){__mapStats.observers.delete(this);return super.disconnect()}};
    const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame=fn=>{
     if(fn.name!=='tick')return raf(fn);
     const id=raf(time=>{__mapStats.pending.delete(id);__mapStats.frames++;fn(time)});
     __mapStats.pending.add(id);__mapStats.max=Math.max(__mapStats.max,__mapStats.pending.size);return id;
    };
    window.cancelAnimationFrame=id=>{__mapStats.pending.delete(id);cancel(id)};
    document.addEventListener('dragstart',e=>{if(e.target.closest('#lmBoard'))__mapStats.ghosts++});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4211/#/home');await page.waitForFunction(()=>JMA_AUTH.getState().ready);
   await page.evaluate(async()=>{
    await JMA_AUTH.signInWithPassword('preview@example.invalid','test-password');
    const write=JMA_STORE.write.bind(JMA_STORE);JMA_STORE.write=(key,value)=>{if(key==='jma_map_view')__mapStats.writes.push({...value});return write(key,value)};
    location.hash='#/map';
   });
   await page.waitForSelector('#lmBoard');await page.waitForFunction(()=>document.querySelector('#lmMapImage').naturalWidth>0);await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(300);return {context,page};
  };
  const view=page=>page.evaluate(()=>{
   const b=document.querySelector('#lmBoard'),p=document.querySelector('#lmPlane'),r=b.getBoundingClientRect(),pr=p.getBoundingClientRect(),z=Number(p.style.transform.match(/scale\(([^)]+)\)/)[1]);
   const offset=value=>{const m=value.match(/([+-])\s*([\d.]+)px/);return m?(m[1]==='-'?-1:1)*Number(m[2]):0};
   return {zoom:z,x:offset(p.style.transform.startsWith('translate3d')?p.style.transform.split(',')[0]:p.style.left),y:offset(p.style.transform.startsWith('translate3d')?p.style.transform.split(',')[1]:p.style.top),maxX:Math.max(0,(pr.width-b.clientWidth)/2),maxY:Math.max(0,(pr.height-b.clientHeight)/2)};
  });
  const near=(a,b,tolerance=.1)=>Math.abs(a-b)<tolerance;
  const box=async page=>{await page.locator('#lmBoard').scrollIntoViewIfNeeded();await page.waitForTimeout(100);return page.locator('#lmBoard').boundingBox()};
  const setView=async(page,value)=>{
   await page.mouse.move(0,0);await page.evaluate(value=>{JMA_STORE.write('jma_map_view',value);JMA_RENDER()},value);
   await page.waitForFunction(()=>document.querySelector('#lmMapImage').naturalWidth>0);await page.waitForTimeout(50);return box(page);
  };
  const pointer=async(page,b,x,y)=>page.mouse.move(b.x+b.width*x,b.y+b.height*y);
  const stable=async(page,label)=>{const a=await view(page);await page.waitForTimeout(250);const b=await view(page);ok(near(a.x,b.x)&&near(a.y,b.y),label)};
  // Reproduce the reported alternative drag with actual Pointer Capture before changes.
  const before=await create(1920,false,true);let b=await setView(before.page,{zoom:1.75,x:0,y:0});
  await pointer(before.page,b,.5,.5);await before.page.mouse.down();await pointer(before.page,b,.55,.56);await before.page.mouse.up();
  metrics.baselineDrag=await view(before.page);ok(metrics.baselineDrag.x>40&&metrics.baselineDrag.y>30,'Baseline native drag reproduced: map follows, no simulated image drag');
  ok(await before.page.evaluate(()=>__mapStats.ghosts===0),'Baseline original map image already prevents native ghost drag');
  metrics.baselineGeometry=await before.page.locator('#lmBoard').boundingBox();await before.page.emulateMedia({reducedMotion:'no-preference'});b=await setView(before.page,{zoom:1.75,x:0,y:0});await pointer(before.page,b,.8,.5);await before.page.waitForTimeout(700);await before.page.mouse.move(0,0);metrics.baselinePanDistance=Math.abs((await view(before.page)).x);await before.context.close();
  const {context,page}=await create(1920);
  ok(await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches),'Desktop test uses real fine-pointer hover media');
  ok((await page.textContent('#lmInstruction')).startsWith('MAUS ZUM RAND = GLEITEN'),'Desktop caption explains edge pan in existing instruction area');
  const shell=()=>page.evaluate(()=>{const h=document.querySelector('.lm-command-head,.hud-hero'),r=h.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height,padding:getComputedStyle(h).padding}});
  const mapShell=await shell();await page.evaluate(()=>location.hash='#/database');await page.waitForSelector('.database-page');const dbShell=await shell();ok(JSON.stringify(mapShell)===JSON.stringify(dbShell),'1920 database → map share exact outer width, hero height and padding');
  await page.screenshot({path:path.join(out,'1920-database.png')});await page.evaluate(()=>location.hash='#/map');await page.waitForSelector('#lmBoard');
  metrics.desktop=await page.evaluate(()=>Object.fromEntries(['.lm-workspace','.lm-rail','.lm-map-column','.lm-detail','.lm-board'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{width:r.width,height:r.height}]})));
  ok(metrics.desktop['.lm-map-column'].width/metrics.desktop['.lm-workspace'].width>.79&&metrics.desktop['.lm-rail'].width<=180&&metrics.desktop['.lm-detail'].width<=200,'1920 map occupies almost four fifths of workspace with compact side panels');
  ok(await page.locator('#lmBoard').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0}),'1920 all map edges reachable immediately without page scroll');
  ok(await page.locator('.lm-rail').evaluate(el=>[...el.querySelectorAll('button,input,select')].every(c=>c.getBoundingClientRect().right<=el.getBoundingClientRect().right-1&&c.clientWidth>=44)),'1920 compact navigation retains unclipped controls');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'1920-map.png')});
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const [name,x,y,sx,sy] of [['left',.015,.5,1,0],['right',.985,.5,-1,0],['top',.5,.015,0,1],['bottom',.5,.985,0,-1],['diagonal',.985,.985,-1,-1]]){
   b=await setView(page,{zoom:1.75,x:0,y:0});await pointer(page,b,x,y);await page.waitForTimeout(450);const v=await view(page);
   ok((!sx||v.x*sx>45)&&(!sy||v.y*sy>45),name+' edge reveals world in cursor direction without clicking');await page.mouse.move(0,0);
  }
  b=await setView(page,{zoom:1.75,x:0,y:0});await pointer(page,b,.58,.6);await stable(page,'Wide central dead zone stays stationary');
  await pointer(page,b,.985,.5);await page.waitForTimeout(300);await pointer(page,b,.5,.5);await page.waitForTimeout(450);await stable(page,'Center stops smoothly and terminates the pan RAF');
  ok(await page.evaluate(()=>__mapStats.pending.size===0),'No idle pan RAF in dead zone');
  await pointer(page,b,.985,.5);await page.waitForTimeout(100);await page.mouse.move(0,0);await stable(page,'Pointerleave stops immediately');
  await page.emulateMedia({reducedMotion:'reduce'});await pointer(page,b,.985,.5);await page.waitForTimeout(100);await pointer(page,b,.5,.5);await page.waitForTimeout(80);await stable(page,'Reduced Motion stops without an inertial tail');await page.emulateMedia({reducedMotion:'no-preference'});
  const distance=async x=>{const b=await setView(page,{zoom:1.75,x:0,y:0});await pointer(page,b,x,.5);await page.waitForTimeout(400);await page.mouse.move(0,0);return Math.abs((await view(page)).x)};
  metrics.slowDistance=await distance(.69);metrics.edgeDistance=await distance(.97);ok(metrics.edgeDistance>metrics.slowDistance*5&&metrics.slowDistance>1,'Progressive edge speed substantially exceeds slow start');
  b=await setView(page,{zoom:1.75,x:0,y:0});await pointer(page,b,.8,.5);await page.waitForTimeout(700);await page.mouse.move(0,0);metrics.visiblePanDistance=Math.abs((await view(page)).x);ok(metrics.visiblePanDistance>100&&metrics.visiblePanDistance>metrics.baselinePanDistance*4,'Normal move toward edge visibly travels over 100px, at least four times baseline');
  for(const [name,x,y,key,sign] of [['left',.01,.5,'x',1],['right',.99,.5,'x',-1],['top',.5,.01,'y',1],['bottom',.5,.99,'y',-1]]){
   await setView(page,{zoom:1.75,x:0,y:0});const limits=await view(page);b=await setView(page,{zoom:1.75,x:key==='x'?sign*(limits.maxX-25):0,y:key==='y'?sign*(limits.maxY-25):0});
   await pointer(page,b,x,y);await page.waitForTimeout(500);const v=await view(page);ok(near(v[key],sign*v[key==='x'?'maxX':'maxY'],.15),name+' boundary reached without overscroll');
   await stable(page,name+' boundary has no jitter');ok(await page.evaluate(()=>__mapStats.pending.size===0),name+' boundary stops RAF');
  }
  b=await setView(page,{zoom:1,x:0,y:0});const full=await view(page);const visibleAxis=full.maxX<1?'x':'y';await pointer(page,b,visibleAxis==='x'?.99:.5,visibleAxis==='y'?.99:.5);await stable(page,'100% fully visible axis never pans');ok(await page.evaluate(()=>__mapStats.pending.size===0),'100% fully visible axis does not run RAF');
  const worldAt=(page,x,y)=>page.evaluate(({x,y})=>{const r=document.querySelector('#lmPlane').getBoundingClientRect();return {x:(x-r.x)/r.width,y:(y-r.y)/r.height}},{x,y});
  b=await setView(page,{zoom:1.7,x:40,y:25});const anchor={x:Math.round(b.x+b.width*.62),y:Math.round(b.y+b.height*.57)};await page.mouse.move(anchor.x,anchor.y);const world=await worldAt(page,anchor.x,anchor.y),scroll=await page.evaluate(()=>scrollY);
  for(const delta of [-100,100]){await page.mouse.wheel(0,delta);await page.waitForTimeout(70);const after=await worldAt(page,anchor.x,anchor.y);ok(near(world.x,after.x,.00001)&&near(world.y,after.y,.00001),'Wheel '+delta+' keeps world point beneath cursor');}
  ok(await page.evaluate(s=>scrollY===s,scroll),'Wheel over board prevents page scroll');
  await page.waitForTimeout(300);const writesBefore=await page.evaluate(()=>__mapStats.writes.length);
  for(let i=0;i<12;i++)await page.mouse.wheel(0,-2);await page.waitForTimeout(350);
  metrics.wheelWrites=await page.evaluate(n=>__mapStats.writes.length-n,writesBefore);ok(metrics.wheelWrites===1,'Trackpad burst persists once after debounce, not once per event');
  const previous=await view(page);await page.mouse.wheel(0,-.4);await page.waitForTimeout(60);const tiny=await view(page);ok(tiny.zoom>previous.zoom&&tiny.zoom-previous.zoom<.002,'Subpixel trackpad delta stays smooth');
  await page.mouse.wheel(0,-100000);await page.waitForTimeout(60);ok((await view(page)).zoom/tiny.zoom<1.18,'Extreme wheel delta is capped per event');
  await page.mouse.move(5,500);const oldScroll=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,100);await page.waitForTimeout(150);ok(await page.evaluate(s=>scrollY>s,oldScroll),'Wheel outside map retains normal page scrolling');
  b=await setView(page,{zoom:1.75,x:0,y:0});await pointer(page,b,.5,.5);await page.mouse.down();ok(await page.locator('#lmBoard').evaluate(el=>el.classList.contains('dragging')&&getComputedStyle(el).cursor==='grabbing'),'Active drag has grabbing cursor');
  await pointer(page,b,.58,.56);const dragView=await view(page);await page.waitForTimeout(200);const held=await view(page);ok(near(dragView.x,held.x)&&near(dragView.y,held.y),'Hover pauses completely during captured drag');await page.mouse.up();await page.mouse.move(0,0);
  ok(dragView.x>80&&dragView.y>35,'Native mouse drag follows pointer as secondary control');ok(await page.evaluate(()=>__mapStats.ghosts===0&&getSelection().toString()===''),'No native ghost image or selected board text');
  ok(await page.locator('#lmBoard').evaluate(el=>getComputedStyle(el).userSelect==='none'&&getComputedStyle(el.querySelector('img')).webkitUserDrag==='none'),'Drag prevention is scoped to the map surface');
  // A known original marker near the edge must remain still while hovered.
  await setView(page,{zoom:1.75,x:0,y:0});const marker=page.locator('[data-lm-marker="loc-psi"]');
  const markerCoords=await marker.evaluate(el=>({x:parseFloat(el.style.left)/100,y:parseFloat(el.style.top)/100}));
  const dimensions=await page.locator('#lmBoard').evaluate(el=>({w:el.clientWidth,h:el.clientHeight,pw:parseFloat(document.querySelector('#lmPlane').style.width),ph:parseFloat(document.querySelector('#lmPlane').style.height)}));
  b=await setView(page,{zoom:1.75,x:dimensions.w*.33-(markerCoords.x-.5)*dimensions.pw*1.75,y:-(markerCoords.y-.5)*dimensions.ph*1.75});
  await marker.hover();await stable(page,'Interactive marker near edge pauses hover pan');await marker.click();await page.waitForSelector('.lm-detail-selected');ok(await page.evaluate(()=>JMA_STORE.read('jma_map_selected')==='loc-psi'),'Original marker click selects correct dossier');
  const dossierFits=()=>page.locator('.lm-detail').evaluate(el=>{const r=el.getBoundingClientRect();return el.scrollWidth===el.clientWidth&&[...el.querySelectorAll('button')].every(b=>{const c=b.getBoundingClientRect();return c.left>=r.left&&c.right<=r.right&&c.top>=r.top&&c.bottom<=Math.min(r.bottom,innerHeight)})});
  ok(await dossierFits(),'1920 selected dossier keeps every action visible without clipping or overflow');
  b=await setView(page,{zoom:1.75,x:0,y:0});await page.click('#lmPlace');await pointer(page,b,.99,.99);await stable(page,'Placement crosshair freezes hover and view');ok(await page.locator('#lmBoard').evaluate(el=>getComputedStyle(el).cursor==='crosshair'),'Placement has crosshair cursor');
  await page.locator('#lmBoard').click({position:{x:b.width*.6,y:b.height*.5}});await page.waitForSelector('#lmMarkerDialog[open]');await pointer(page,b,.99,.5);await stable(page,'Open marker dialog prevents automatic pan');await page.locator('#lmMarkerDialog .dialog-close').click();
  b=await setView(page,{zoom:1.75,x:0,y:0});const panWrites=await page.evaluate(()=>__mapStats.writes.length);await pointer(page,b,.99,.5);await page.waitForTimeout(500);
  ok(await page.evaluate(n=>__mapStats.writes.length===n,panWrites),'Active hover frames perform no storage writes');
  await page.evaluate(()=>location.hash='#/home');await page.waitForSelector('.landing');const saved=await page.evaluate(()=>JMA_STORE.read('jma_map_view'));ok(saved.x<-50,'Route exit flushes most recent moving view');ok(await page.evaluate(()=>__mapStats.pending.size===0),'Route exit cancels pending pan RAF');
  await page.mouse.move(0,0);await page.evaluate(()=>location.hash='#/map');await page.waitForSelector('#lmBoard');await page.waitForFunction(()=>document.querySelector('#lmMapImage').naturalWidth>0);await page.waitForSelector('.lm-flyby-creature',{state:'attached'});await page.evaluate(()=>window.__flyNode=document.querySelector('.lm-flyby-creature'));const restored=await view(page);ok(near(saved.x,restored.x,1)&&near(saved.y,restored.y,1)&&near(saved.zoom,restored.zoom),'Reentry restores persisted view');
  b=await box(page);await pointer(page,b,.99,.5);await page.waitForTimeout(100);await page.evaluate(()=>JMA_RENDER());await page.waitForTimeout(100);ok(await page.evaluate(()=>__mapStats.pending.size===0&&__mapStats.max===1),'Render disposes old controller: maximum one pan RAF');ok(await page.evaluate(()=>document.querySelector('.lm-flyby-creature')===__flyNode),'Controller re-render preserves existing one-shot fly-by instance');
  b=await box(page);await pointer(page,b,.99,.5);await page.waitForTimeout(100);await page.evaluate(()=>document.querySelector('#lmBoard').remove());await page.waitForTimeout(80);ok(await page.evaluate(()=>__mapStats.pending.size===0),'External DOM removal cancels pan and observers');await page.evaluate(()=>JMA_RENDER());await page.waitForSelector('#lmBoard');await page.mouse.move(0,0);await page.evaluate(()=>document.querySelector('#lmBoard').remove());await page.waitForTimeout(80);ok(await page.evaluate(()=>__mapStats.observers.size===0),'Idle nested board removal disconnects ResizeObserver without needing a pan frame');await page.evaluate(()=>JMA_RENDER());await page.waitForSelector('#lmBoard');
  // User explicitly withdrew fixed-position navigation; retain existing query shortcuts.
  await page.locator('[data-lm-focus-search]').click();ok(await page.locator('#lmSearch').evaluate(el=>document.activeElement===el),'Existing marker-selection shortcut available on desktop');
  await page.locator('[data-lm-filter-label="Ressourcen"]').click();ok(await page.inputValue('#lmSearch')==='Ressourcen','Existing resource shortcut shares query state on desktop');await page.locator('[data-lm-filter-label="Abweichler"]').click();ok(await page.inputValue('#lmSearch')==='Abweichler','Existing deviation shortcut shares query state on desktop');await page.click('#lmResetFilters');
  await page.setViewportSize({width:1280,height:1080});await page.waitForTimeout(150);metrics.desktop1280=await page.locator('#lmBoard').boundingBox();
  ok(metrics.desktop1280.width>=860&&await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'1280 map remains usable without horizontal overflow');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'1280-map.png')});
  await page.locator('[data-lm-marker="loc-psi"]').click();await page.mouse.move(0,0);ok(await dossierFits(),'1280 selected dossier keeps every action visible without clipping or overflow');
  ok(await page.locator('#lmBoard').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'1280 bottom map edge remains visible without page scroll');
  await context.close();
  const mobileBefore=await create(390,true,true);
  const mobileSnapshot=p=>p.evaluate(()=>[...document.querySelectorAll('.lm-workspace,.lm-rail,.lm-map-column,.lm-detail,.lm-board,.lm-panel-title b,.lm-panel-title small,.lm-field select,.lm-search input,.lm-category-list button,.lm-detail-empty p')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {cls:el.className,width:r.width,height:r.height,font:s.fontSize}}));
  const mobileBase=await mobileSnapshot(mobileBefore.page);await mobileBefore.context.close();
  const mobile=await create(390,true);const mp=mobile.page;ok(JSON.stringify(await mobileSnapshot(mp))===JSON.stringify(mobileBase),'390 mobile composition, dimensions and changed-selector fonts exactly match baseline');
  ok(await mp.evaluate(()=>!matchMedia('(hover:hover) and (pointer:fine)').matches&&document.documentElement.scrollWidth===innerWidth),'390 touch has no desktop hover and no horizontal overflow');
  b=await box(mp);await mp.mouse.move(b.x+b.width*.99,b.y+b.height*.5);await stable(mp,'390 emulated mouse cannot activate desktop hover');ok(await mp.evaluate(()=>__mapStats.frames===0),'390 never schedules pan RAF');
  const cdp=await mobile.context.newCDPSession(mp),x=b.x+100,y=b.y+160;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1},{x:x+80,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-15,y,id:1},{x:x+120,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const pinched=await view(mp);ok(pinched.zoom>1.4,'390 native two-finger pinch retains anchored zoom');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+30,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const panned=await view(mp);ok(!near(panned.x,pinched.x)||!near(panned.y,pinched.y),'390 native single-finger pan preserved');
  await mp.reload();await mp.waitForSelector('#lmBoard');await mp.waitForFunction(()=>document.querySelector('#lmMapImage').naturalWidth>0);const reload=await view(mp);ok(near(reload.x,panned.x,1)&&near(reload.y,panned.y,1)&&near(reload.zoom,panned.zoom),'390 touch view persists after reload');
  await mp.click('#lmResetView');await mp.locator('[data-lm-marker="loc-psi"]').click();ok(await mp.locator('.lm-detail-selected').count()===1,'390 marker selection and dossier retained');
  await mp.locator('[data-lm-filter-label="Ressourcen"]').click();ok(await mp.inputValue('#lmSearch')==='Ressourcen','390 existing shortcut retained');await mp.click('#lmResetFilters');await mp.click('#lmZoomIn');ok(await mp.textContent('#lmZoomLabel')==='115%','390 zoom buttons unchanged');
  ok(await mp.textContent('#lmInstruction')==='ZIEHEN = VERSCHIEBEN · MAUSRAD / ± = ZOOMEN','390 retains original caption after native touch, reload and button interactions');
  await mp.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await mp.screenshot({path:path.join(out,'390-map.png'),fullPage:true});ok(errors.length===0,'No browser exceptions in original/current desktop and mobile sessions');await mobile.context.close();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({baseline,checks,results,metrics,errors},null,2));console.log('PASS map-desktop checks:',checks);
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
