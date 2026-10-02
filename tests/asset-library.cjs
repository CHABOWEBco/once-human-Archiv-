// Browser integration against real PostgreSQL policies through a local test adapter.
// Supabase Auth is a test fixture; no live data is written.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const {setup,asRole,ids}=require('./asset-library-sql.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/asset-library');fs.mkdirSync(out,{recursive:true});
let checks=0;const ok=(value,label)=>{assert.ok(value,label);console.log('PASS UI',++checks,label)};
const columns=['id','name','asset_type','category','file_ref','catalog_id','status','sort_order','metadata','revision'];
const fixture=`(()=>{
const role=localStorage.getItem('asset-test-role')||'owner',user={id:${JSON.stringify(ids)}[role],email:role+'@example.invalid',created_at:'2026-09-01T00:00:00Z',user_metadata:{}},session={user};
const client={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session}}),signOut:async()=>({error:null}),updateUser:async()=>({data:{user}})},from(table){
let action='select',payload,filters=[],start=0,end=499;const execute=async()=>{
 if(table==='profiles')return {data:{id:user.id,display_name:'Asset Test',avatar_url:null},error:null};
 if(table==='user_roles')return {data:{user_id:user.id,role},error:null};
 return fetch('/test-db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({table,role,action,payload,filters,start,end,missing:localStorage.getItem('asset-test-missing')==='yes'})}).then(r=>r.json());
};return {select(){return this},order(){return this},eq(k,v){filters.push([k,v]);return this},range(a,b){start=a;end=b;return execute()},insert(p){action='insert';payload=p;return this},update(p){action='update';payload=p;return this},maybeSingle:execute,single:execute};}};
globalThis.supabase={createClient:()=>client};})();`;
(async()=>{
 const db=await setup();let queue=Promise.resolve();
 const server=http.createServer((req,res)=>{
  if(req.url==='/test-db'){
   let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
    queue=queue.then(async()=>{
     try{
      const q=JSON.parse(body);if(!ids[q.role])throw Error('Bad fixture role');
      if(q.table==='asset_library'&&q.missing){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data:null,error:{code:'PGRST205',message:'Missing table'}}))}
      const result=await asRole(db,q.role,async()=>{
       if(q.table==='catalog_entries')return (await db.query('select * from catalog_entries order by id limit $1 offset $2',[q.end-q.start+1,q.start])).rows;
       if(q.table!=='asset_library')throw Error('Unsupported test table');
       if(q.action==='select')return (await db.query('select * from asset_library order by id limit $1 offset $2',[q.end-q.start+1,q.start])).rows;
       const keys=Object.keys(q.payload);if(keys.some(k=>!columns.includes(k)))throw Error('Bad column');
       const values=keys.map(k=>q.payload[k]),args=keys.map((k,i)=>'$'+(i+1));
       if(q.action==='insert')return (await db.query('insert into asset_library('+keys.join(',')+') values('+args.join(',')+') returning *',values)).rows[0]||null;
       const where=q.filters.map(([k,v])=>{if(!['id','revision'].includes(k))throw Error('Bad filter');values.push(v);return k+'=$'+values.length}).join(' and ');
       return (await db.query('update asset_library set '+keys.map((k,i)=>k+'='+args[i]).join(',')+' where '+where+' returning *',values)).rows[0]||null;
      });res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:result,error:null}));
     }catch(error){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:error.code,message:error.message}}))}
    });
   });return;
  }
  const rel=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,rel==='/'?'index.html':rel);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(err,bytes)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(bytes)});
 });
 await new Promise(resolve=>server.listen(4194,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'/tmp/once-human-chrome/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const contexts=[];
 async function pageFor(role,width=1920,missing=false){
  const context=await browser.newContext({viewport:{width,height:1080},hasTouch:width===390});contexts.push(context);
  await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:fixture}));
  const page=await context.newPage();page.on('dialog',d=>d.accept());
  await page.addInitScript(({role,missing})=>{localStorage.setItem('asset-test-role',role);if(missing)localStorage.setItem('asset-test-missing','yes');sessionStorage.setItem('oha:admin-preview:view','assets')},{role,missing});
  await page.goto('http://127.0.0.1:4194/#/admin');await page.waitForFunction(()=>JMA_AUTH.getState().ready);
  if(role!=='user')await page.waitForFunction(missing=>document.querySelector('[data-asset-message]')?.textContent.includes(missing?'noch nicht':'Supabase verbunden'),missing);
  return page;
 }
 const field=(p,key)=>p.locator('[data-asset-field="'+key+'"]');
 async function save(p,text='in Supabase gespeichert'){await p.locator('[data-asset-save]').click();await p.waitForFunction(text=>document.querySelector('[data-asset-message]')?.textContent.includes(text)&&document.querySelector('[data-asset-save]')?.disabled===false,text)}
 async function open(p,id){await p.locator('[data-asset-search]').fill(id);await p.locator('[data-asset-open="'+id+'"]').click()}
 try{
  const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
  ok(await page.locator('[data-asset-open]').count()===128,'All existing metadata sources displayed');
  const firstId=await field(page,'id').inputValue();await save(page);
  ok((await db.query('select revision from asset_library where id=$1',[firstId])).rows[0].revision===2,'Initial selection uses loaded persisted revision, without duplicate insert');
  await page.locator('[data-asset-filter="type"]').selectOption('avatar');ok(await page.locator('[data-asset-open]:visible').count()===36,'Avatar type filter');
  await page.locator('[data-asset-filter="category"]').selectOption('website');ok(await page.locator('[data-asset-open]:visible').count()===0,'Category and type filters combine');
  await page.locator('[data-asset-filter="type"]').selectOption('');ok(await page.locator('[data-asset-open]:visible').count()===19,'Website category filter');
  await page.locator('[data-asset-filter="category"]').selectOption('');await page.locator('[data-asset-search]').fill('by-the-wind');ok(await page.locator('[data-asset-open]:visible').count()===1,'Search by name/ID');
  await page.locator('[data-asset-new]').click();await field(page,'name').fill('Library integration test');await field(page,'file_ref').fill('assets/branding/once-human-logo.png');
  const id=await field(page,'id').inputValue();ok(await page.locator('[data-asset-preview] h3').innerText()==='Library integration test','Pure preview reacts without save');
  await page.evaluate(()=>JMA_RENDER());ok(await field(page,'name').inputValue()==='Library integration test','Draft survives ordinary render');
  await save(page);ok((await db.query('select revision,status from asset_library where id=$1',[id])).rows[0].revision===1,'Create saved through client adapter to PostgreSQL');
  await page.locator('[data-asset-release]').check();ok(await field(page,'status').inputValue()==='active','User release YES sets active status');await save(page);
  await field(page,'status').selectOption('inactive');await save(page);ok((await db.query('select users_available from asset_library where id=$1',[id])).rows[0].users_available===false,'Inactive is not released');
  await field(page,'status').selectOption('archived');await save(page);await page.locator('[data-asset-search]').fill('');await page.locator('[data-asset-filter="status"]').selectOption('archived');
  ok(await page.locator('[data-asset-open]:visible').count()===1,'Archive status filter');
  await page.reload();await page.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));await page.locator('[data-asset-filter="status"]').selectOption('');await open(page,id);
  ok(await field(page,'status').inputValue()==='archived','Saved archive/name survives page reload');
  await field(page,'metadata').fill('{bad');await save(page,'JSON');ok(await field(page,'metadata').inputValue()==='{bad','Invalid JSON refused and draft preserved');
  await field(page,'metadata').fill('{"review":"test"}');await field(page,'name').fill('Reactivated library test');await page.locator('[data-asset-release]').check();await save(page);
  ok((await db.query('select revision,users_available from asset_library where id=$1',[id])).rows[0].revision===5,'Reactivation/edit increments revision');
  await db.query("update asset_library set name='Concurrent change',revision=revision+1 where id=$1",[id]);await field(page,'name').fill('Stale draft');await save(page,'Versionskonflikt');
  ok((await db.query('select name from asset_library where id=$1',[id])).rows[0].name==='Concurrent change'&&await field(page,'name').inputValue()==='Stale draft','Stale write denied; draft retained');
  await page.locator('[data-asset-reload]').click();await page.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));
  await open(page,'profile:frame:blackfell-night');ok(await page.locator('[data-asset-preview] .avatar-image').count()===1&&await page.locator('[data-asset-preview] .avatar-frame').count()===1&&await page.locator('[data-asset-preview] .asset-profile-banner img').count()===1,'Avatar/frame/banner use existing profile helper');
  const before=await page.evaluate(()=>JSON.stringify(JMA_PROFILE.appearance()));await field(page,'name').fill('Preview only');ok(await page.evaluate(()=>JSON.stringify(JMA_PROFILE.appearance()))===before,'Preview does not change account appearance');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Desktop has no horizontal overflow');
  for(const role of ['moderator','admin']){
    const p=await pageFor(role);await p.locator('[data-asset-new]').click();await field(p,'name').fill(role+' browser draft');await save(p);ok((await db.query('select created_by from asset_library where id=$1',[await field(p,'id').inputValue()])).rows[0].created_by===ids[role],role+' browser write uses existing role/session');
  }
  const user=await pageFor('user');ok(await user.locator('[data-asset-save]').count()===0,'User has no management UI');
  ok(await user.evaluate(async()=>{try{await JMA_ASSET_STORE.save({});return false}catch(e){return e.message.includes('Rolle')}}),'Client blocks unauthorized writes');
  ok(await user.evaluate(async()=>{const rows=await JMA_ASSET_STORE.load();return rows.every(r=>r.status==='active')}),'User library load returns only released rows');
  const missing=await pageFor('owner',390,true);ok(await missing.locator('[data-asset-open]').count()===128&&await missing.locator('[data-asset-save]').isDisabled(),'Missing live table is explicit read-only inventory, no local fake save');
  const mobile=await pageFor('owner',390);await open(mobile,'profile:avatar:aberrant-progeny');await mobile.locator('[data-asset-save]').scrollIntoViewIfNeeded();
  ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px no horizontal overflow');
  ok(await mobile.locator('[data-asset-save]').boundingBox().then(b=>b.x>=0&&b.x+b.width<=390&&b.height>=44),'390px save control visible with touch target');
  await field(mobile,'name').fill('Mobile avatar edit');await save(mobile);ok(await mobile.locator('[data-asset-preview] h3').innerText()==='Mobile avatar edit','Touch-sized editor save and preview');
  await mobile.locator('[data-asset-search]').focus();await mobile.keyboard.press('Control+A');await mobile.keyboard.type('By-the-Wind');ok(await mobile.locator('[data-asset-open]:visible').count()===1,'Keyboard search on mobile');
  await mobile.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  for(const p of [page,mobile]){
    await p.evaluate(()=>location.hash='#/profile');await p.waitForSelector('.profile-ref-page');ok(await p.locator('.profile-ref-avatar').count()>0,'Existing profile renders');
    await p.evaluate(()=>location.hash='#/map');await p.waitForSelector('.lm-flyby-creature',{state:'attached'});ok(await p.locator('.lm-flyby-creature').count()===1,'Existing map fly-by still starts once');
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Profile/map route navigation has no overflow');
    await p.evaluate(()=>location.hash='#/guides');await p.waitForSelector('[data-tutorial-start]');await p.locator('[data-tutorial-start]').click();await p.waitForSelector('.rf-tutorial-companion');ok(await p.locator('[data-tutorial-progress]').innerText()==='1 / 5','Pilot tutorial and companion retained');await p.locator('[data-tutorial-close]').click();
  }
  ok(errors.length===0,'No browser exceptions: '+errors.join('; '));console.log('PASS UI checks:',checks);
 }finally{for(const context of contexts)await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));await db.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
