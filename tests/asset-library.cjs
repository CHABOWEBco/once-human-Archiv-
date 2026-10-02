// Browser integration against real PostgreSQL policies through a local test adapter.
// Supabase Auth is a test fixture; no live data is written.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const {setup,setupStorage,asRole,ids}=require('./asset-library-sql.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/asset-library');fs.mkdirSync(out,{recursive:true});
let checks=0;const ok=(value,label)=>{assert.ok(value,label);console.log('PASS UI',++checks,label)};
const columns=['id','name','asset_type','category','file_ref','catalog_id','status','sort_order','metadata','revision','storage_bucket','storage_path'];
const fixture=`(()=>{
const role=localStorage.getItem('asset-test-role')||'owner',user={id:${JSON.stringify(ids)}[role],email:role+'@example.invalid',created_at:'2026-09-01T00:00:00Z',user_metadata:{}},session={user};
const client={storage:{from(bucket){return {
 async upload(objectPath,file,options){
  const fail=sessionStorage.getItem('test-upload-fail'),conflict=sessionStorage.getItem('test-upload-conflict');sessionStorage.removeItem('test-upload-fail');sessionStorage.removeItem('test-upload-conflict');
  return fetch('/test-storage/upload?'+new URLSearchParams({role,bucket,path:objectPath,upsert:options.upsert,fail:fail||'',conflict:conflict||''}),{method:'POST',headers:{'Content-Type':options.contentType},body:file}).then(r=>r.json());
 },
 async createSignedUrl(objectPath,expires){return fetch('/test-storage/sign',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,bucket,path:objectPath,expires})}).then(r=>r.json())}
}}},auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session}}),signOut:async()=>({error:null}),updateUser:async()=>({data:{user}})},from(table){
let action='select',payload,filters=[],start=0,end=499;const execute=async()=>{
 if(table==='profiles')return {data:{id:user.id,display_name:'Asset Test',avatar_url:null},error:null};
 if(table==='user_roles')return {data:{user_id:user.id,role},error:null};
 return fetch('/test-db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({table,role,action,payload,filters,start,end,missing:localStorage.getItem('asset-test-missing')==='yes'})}).then(r=>r.json());
};return {select(){return this},order(){return this},eq(k,v){filters.push([k,v]);return this},range(a,b){start=a;end=b;return execute()},insert(p){action='insert';payload=p;return this},update(p){action='update';payload=p;return this},maybeSingle:execute,single:execute};}};
globalThis.supabase={createClient:()=>client};})();`;
(async()=>{
 const db=await setup();let queue=Promise.resolve();const objectBytes=new Map(),signedTokens=new Map();let uploads=0,signings=0;
 const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/test-signed/')){
   const token=signedTokens.get(req.url.split('/').pop());if(!token||token.until<Date.now())return res.writeHead(403).end();
   res.setHeader('Content-Type',token.mime);return res.end(token.bytes);
  }
  if(req.url.startsWith('/test-storage/')){
   const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{queue=queue.then(async()=>{
    try{
     const body=Buffer.concat(chunks),u=new URL(req.url,'http://test.invalid'),q=Object.fromEntries(u.searchParams);
     const request=u.pathname.endsWith('/sign')?JSON.parse(body):q;if(!ids[request.role])throw Error('Bad fixture role');
     const key=request.bucket+'/'+request.path;
     const result=await asRole(db,request.role,async()=>{
      if(u.pathname.endsWith('/upload')){
       uploads++;if(q.fail)throw Error('Injected upload failure');
       assert.equal(q.upsert,'false','Client never requests overwrite');
       // These checks represent Storage API enforcement of the real bucket configuration.
       await db.exec('reset role');const bucket=(await db.query('select * from storage.buckets where id=$1',[q.bucket])).rows[0];
       await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[q.role]]);await db.exec('set role authenticated');
       if(!bucket||body.length>Number(bucket.file_size_limit)||!bucket.allowed_mime_types.includes(req.headers['content-type']))throw Error('Bucket format/size refused');
       await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[q.bucket,q.path,{mimetype:req.headers['content-type'],size:body.length}]);
       objectBytes.set(key,body);
       if(q.conflict)await db.query('update asset_library set revision=revision+1 where id=$1',[q.path.split('/')[1]]);
       return {path:q.path};
      }
      const object=(await db.query('select * from storage.objects where bucket_id=$1 and name=$2',[request.bucket,request.path])).rows[0];
      if(!object)throw Error('Storage object not authorized');signings++;
      const token=require('node:crypto').randomUUID();signedTokens.set(token,{until:Date.now()+request.expires*1000,bytes:objectBytes.get(key),mime:object.metadata.mimetype});
      return {signedUrl:'http://127.0.0.1:4194/test-signed/'+token};
     });res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:result,error:null}));
    }catch(error){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:error.code,message:error.message}}))}
   })});return;
  }
  if(req.url==='/test-db'){
   let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
    queue=queue.then(async()=>{
     try{
      const q=JSON.parse(body);if(!ids[q.role])throw Error('Bad fixture role');
      if(q.table==='asset_library'&&q.missing){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data:null,error:{code:'PGRST205',message:'Missing table'}}))}
      const result=await asRole(db,q.role,async()=>{
       if(!['catalog_entries','asset_library'].includes(q.table))throw Error('Unsupported test table');
       if(q.action==='select')return (await db.query('select * from '+q.table+' order by id limit $1 offset $2',[q.end-q.start+1,q.start])).rows;
       const allowedColumns=q.table==='catalog_entries'?['id','entry','revision','updated_at','updated_by']:columns;
       const keys=Object.keys(q.payload);if(keys.some(k=>!allowedColumns.includes(k)))throw Error('Bad column');
       const values=keys.map(k=>q.payload[k]),args=keys.map((k,i)=>'$'+(i+1));
       if(q.action==='insert')return (await db.query('insert into '+q.table+'('+keys.join(',')+') values('+args.join(',')+') returning *',values)).rows[0]||null;
       const where=q.filters.map(([k,v])=>{if(!['id','revision'].includes(k))throw Error('Bad filter');values.push(v);return k+'=$'+values.length}).join(' and ');
       return (await db.query('update '+q.table+' set '+keys.map((k,i)=>k+'='+args[i]).join(',')+' where '+where+' returning *',values)).rows[0]||null;
      });res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:result,error:null}));
     }catch(error){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{code:error.code,message:error.message}}))}
    });
   });return;
  }
  const rel=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,rel==='/'?'index.html':rel==='/assets/items/test-catalog-original.png'?'assets/branding/once-human-logo.png':rel);
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
  if(process.argv.includes('--catalog-link')){await require('./catalog-assets.cjs')({db,pageFor,field,save,open,objectBytes,metrics:()=>({uploads,signings}),out});return}
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
  // Phase 2A starts after verifying old-schema static editor compatibility above.
  const storagePage=await pageFor('owner');storagePage.on('pageerror',e=>errors.push(e.message));
  const png=Buffer.from(await storagePage.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=24;const x=c.getContext('2d');x.fillStyle='#45e3f1';x.fillRect(0,0,32,24);return c.toDataURL('image/png').split(',')[1]}),'base64');
  const fixtures={};for(const mime of ['image/jpeg','image/webp'])fixtures[mime]=Buffer.from(await storagePage.evaluate(mime=>{const c=document.createElement('canvas');c.width=40;c.height=30;c.getContext('2d').fillRect(0,0,40,30);return c.toDataURL(mime).split(',')[1]},mime),'base64');
  const choose=(p,name,mime,buffer)=>p.locator('[data-asset-file]').setInputFiles({name,mimeType:mime,buffer});
  async function uploadReady(p){await p.waitForFunction(()=>document.querySelector('[data-asset-upload-message]')?.textContent.includes('noch nicht gespeichert'))}
  async function newUpload(p,name,type='image'){
   await p.locator('[data-asset-new]').click();await field(p,'name').fill(name);await field(p,'asset_type').selectOption(type);
   await choose(p,'same-original.png','image/png',png);await uploadReady(p);return field(p,'id').inputValue();
  }
  const preMigrationId=await newUpload(storagePage,'Not yet migrated');await save(storagePage,'20261002020000_asset_library_storage.sql');
  ok((await db.query('select id from asset_library where id=$1',[preMigrationId])).rows.length===0,'Missing Storage migration explicitly blocks upload before reserving any row');
  await storagePage.locator('[data-asset-file-clear]').click();
  await setupStorage(db);await storagePage.reload();await storagePage.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));
  const uploadId=await newUpload(storagePage,'Original-byte upload','deviation');
  ok(await storagePage.locator('[data-asset-preview] img').getAttribute('src').then(s=>s.startsWith('blob:')),'Local original preview before upload');
  await storagePage.evaluate(()=>JMA_RENDER());ok(await storagePage.locator('[data-asset-upload-message]').innerText().then(s=>s.includes('same-original.png'))&&await storagePage.locator('[data-asset-file]').evaluate(el=>el.files[0]?.name==='same-original.png'),'File selection, native filename and preview survive ordinary render');
  await save(storagePage);
  let stored=(await db.query('select * from asset_library where id=$1',[uploadId])).rows[0];const oldPath=stored.storage_path;
  ok(stored.status==='draft'&&stored.revision===2&&stored.file_ref===null&&stored.storage_bucket==='archive-assets','Reserved draft becomes one normalized Storage record with revision 2');
  ok(objectBytes.get(stored.storage_bucket+'/'+oldPath).equals(png)&&stored.metadata.upload.sha256===require('node:crypto').createHash('sha256').update(png).digest('hex')&&stored.metadata.upload.original_name==='same-original.png','Stored original bytes, SHA256 and original filename match exactly');
  await storagePage.waitForFunction(()=>{const i=document.querySelector('[data-asset-preview] img');return i?.src.includes('/test-signed/')&&i.complete&&i.naturalWidth===32});
  ok(await storagePage.locator('[data-asset-preview] .profile-avatar').count()===0,'Deviation remains an image preview, never a profile avatar');
  const signedBefore=signings;await storagePage.evaluate(()=>JMA_RENDER());await storagePage.waitForTimeout(200);ok(signings===signedBefore,'Signed preview requests reused during ordinary render');
  await field(storagePage,'status').selectOption('active');await save(storagePage);
  const activeRow=(await db.query('select * from asset_library where id=$1',[uploadId])).rows[0];
  ok(await user.evaluate(async row=>!!(await JMA_ASSET_STORE.imageUrl(row,'deviation')),activeRow),'User can sign only the saved active image');
  ok(await user.evaluate(async row=>{try{await JMA_ASSET_STORE.imageUrl(row,'avatar');return false}catch{return true}},activeRow),'Purpose check rejects deviation used as avatar');
  await choose(storagePage,'same-original.png','image/png',png);await uploadReady(storagePage);await save(storagePage);
  stored=(await db.query('select * from asset_library where id=$1',[uploadId])).rows[0];
  ok(stored.storage_path!==oldPath&&objectBytes.has('archive-assets/'+oldPath)&&stored.revision===4,'Same original filename creates fresh UUID; old file preserved without overwrite');
  const replacementPath=stored.storage_path,priorUploads=uploads;
  await choose(storagePage,'same-original.png','image/png',png);await uploadReady(storagePage);await storagePage.evaluate(()=>sessionStorage.setItem('test-upload-fail','yes'));await save(storagePage,'Bisheriger Datensatz');
  ok((await db.query('select storage_path,revision from asset_library where id=$1',[uploadId])).rows[0].storage_path===replacementPath&&uploads===priorUploads+1,'Failed replacement leaves previous active image and record intact');
  await storagePage.evaluate(()=>sessionStorage.setItem('test-upload-conflict','yes'));await save(storagePage,'Versionskonflikt');
  ok((await db.query('select storage_path from asset_library where id=$1',[uploadId])).rows[0].storage_path===replacementPath,'Failed final revision commit leaves previous pointer; staged object stays private');
  await storagePage.locator('[data-asset-file-clear]').click();await storagePage.locator('[data-asset-reload]').click();await storagePage.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));await open(storagePage,uploadId);
  for(const status of ['inactive','archived']){
   await field(storagePage,'status').selectOption(status);await save(storagePage);const row=(await db.query('select * from asset_library where id=$1',[uploadId])).rows[0];
   ok(!row.users_available&&await user.evaluate(async row=>(await JMA_ASSET_STORE.imageUrl(row,'deviation'))===null,row),'Saved '+status+' unavailable to normal user');
   ok(await user.evaluate(async row=>{const c=supabase.createClient();const r=await c.storage.from(row.storage_bucket).createSignedUrl(row.storage_path,60);return !!r.error},row),'Server RLS blocks guessed '+status+' Storage signing');
  }
  await storagePage.reload();await storagePage.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));await open(storagePage,uploadId);
  ok(await field(storagePage,'status').inputValue()==='archived','Stored Storage reference and archive survive reload');
  const failId=await newUpload(storagePage,'Failure-safe new upload');await field(storagePage,'status').selectOption('active');await storagePage.evaluate(()=>sessionStorage.setItem('test-upload-fail','yes'));await save(storagePage,'Metadaten-Entwurf');
  let failedRow=(await db.query('select * from asset_library where id=$1',[failId])).rows[0];
  ok(failedRow.status==='draft'&&failedRow.storage_path===null&&failedRow.revision===1&&!failedRow.users_available&&await field(storagePage,'status').inputValue()==='draft'&&!(await storagePage.locator('[data-asset-release]').isChecked()),'Failed new upload remains an un-released draft in DB and editor');
  await field(storagePage,'status').selectOption('active');await save(storagePage);failedRow=(await db.query('select * from asset_library where id=$1',[failId])).rows[0];ok(failedRow.status==='active'&&failedRow.revision===2,'Retry adopts reserved draft instead of duplicate insert');
  await field(storagePage,'status').selectOption('archived');await save(storagePage);
  for(const [mime,ext]of [['image/jpeg','jpeg'],['image/webp','webp']]){
   await storagePage.locator('[data-asset-new]').click();await field(storagePage,'name').fill('Accepted '+ext);await field(storagePage,'asset_type').selectOption('avatar');await choose(storagePage,'original.'+ext,mime,fixtures[mime]);await uploadReady(storagePage);await save(storagePage);
   const row=(await db.query('select * from asset_library where id=$1',[await field(storagePage,'id').inputValue()])).rows[0];
   ok(row.metadata.upload.mime===mime&&objectBytes.get('archive-assets/'+row.storage_path).equals(fixtures[mime]),ext+' uploaded unchanged with canonical normalized extension');
   await storagePage.waitForFunction(()=>document.querySelector('[data-asset-preview] .avatar-image')?.src.includes('/test-signed/'));
   ok(await storagePage.locator('[data-asset-preview] .avatar-frame').count()===1&&await storagePage.locator('[data-asset-preview] .asset-profile-banner img').count()===1,'Storage avatar reuses existing combined profile preview');
   await field(storagePage,'status').selectOption('archived');await save(storagePage);
  }
  for(const type of ['ring','wreath','trophy']){
   await newUpload(storagePage,'Raster '+type,type);
   assert.ok(await storagePage.locator('[data-asset-preview] .asset-image-preview img').getAttribute('src').then(s=>s.startsWith('blob:')));
   await save(storagePage);await storagePage.waitForFunction(()=>{const i=document.querySelector('[data-asset-preview] .asset-image-preview img');return i?.src.includes('/test-signed/')&&i.complete&&i.naturalWidth===32});
   ok(await storagePage.locator('[data-asset-preview] .profile-avatar').count()===1,type+' original raster is inspectable alongside unchanged CSS/profile preview');
   await field(storagePage,'status').selectOption('archived');await save(storagePage);
  }
  const countBeforeInvalid=(await db.query('select count(*) from storage.objects')).rows[0].count;
  for(const [name,mime,bytes]of [['bad.svg','image/svg+xml',Buffer.from('<svg/>')],['bad.zip','application/zip',Buffer.from('PK')],['spoof.png','image/png',fixtures['image/jpeg']],['broken.png','image/png',png.subarray(0,16)],['large.png','image/png',Buffer.alloc(8388609)]]){
   await choose(storagePage,name,mime,bytes);await storagePage.waitForFunction(()=>{const t=document.querySelector('[data-asset-upload-message]')?.textContent;return t&&!t.includes('prüft')&&!t.includes('wird geprüft')&&!t.includes('noch nicht gespeichert')});
   ok(await storagePage.locator('[data-asset-preview] img').first().getAttribute('src').then(s=>!s?.startsWith('blob:')),'Invalid '+name+' refused before upload');
  }
  const tooWide=Buffer.from(await storagePage.evaluate(()=>{const c=document.createElement('canvas');c.width=8193;c.height=1;return c.toDataURL('image/png').split(',')[1]}),'base64');await choose(storagePage,'wide.png','image/png',tooWide);await storagePage.waitForFunction(()=>document.querySelector('[data-asset-upload-message]')?.textContent.includes('8192'));
  ok((await db.query('select count(*) from storage.objects')).rows[0].count===countBeforeInvalid,'Invalid types, spoofed/corrupt, oversized bytes and dimensions create no objects');
  for(const role of ['moderator','admin']){
   const p=await pageFor(role);const id=await newUpload(p,role+' storage draft');await save(p);ok((await db.query('select created_by,storage_path from asset_library where id=$1',[id])).rows[0].storage_path,'Existing '+role+' session uploads through same editor');
   await field(p,'status').selectOption('archived');await save(p);
  }
  const storageMobile=await pageFor('owner',390);await newUpload(storageMobile,'Mobile storage preview','banner');
  ok(await storageMobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px local Storage selection and combined preview have no overflow');
  await storageMobile.locator('[data-asset-file-clear]').scrollIntoViewIfNeeded();ok(await storageMobile.locator('[data-asset-file-clear]').boundingBox().then(b=>b.x>=0&&b.x+b.width<=390&&b.height>=44),'390px clear-file control fits with 44px touch target');
  await storageMobile.locator('[data-asset-save]').focus();await storageMobile.keyboard.press('Enter');await storageMobile.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('in Supabase gespeichert'));
  ok(await storageMobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px keyboard save and persisted original preview fit');
  await storagePage.screenshot({path:path.join(out,'storage-desktop.png'),fullPage:true});await storageMobile.screenshot({path:path.join(out,'storage-mobile.png'),fullPage:true});
  ok(errors.length===0,'No browser exceptions: '+errors.join('; '));console.log('PASS UI checks:',checks);

 }finally{for(const context of contexts)await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));await db.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
