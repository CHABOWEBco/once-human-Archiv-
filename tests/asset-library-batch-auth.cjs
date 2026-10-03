// Auth events, actual ZIP reads and real local PostgreSQL/Storage adapter only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {zipSync}=require('../vendor/fflate-0.8.2.min.js');
module.exports=async({db,pageFor,metrics,out,objectBytes})=>{
 let checks=0;const ok=(x,label)=>{assert.ok(x,label);console.log('PASS BATCH AUTH',++checks,label)};
 const pkg='OnceHuman_CMS_v2_03_Database_World_Items.zip';
 await db.query("insert into asset_library(id,name,asset_type,category,status,metadata) values('auth-private-proof','Private fixture','image','profile','archived','{}')");
 const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const colors=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=31;c.height=27;return Promise.all(['#134251','#534151','#334159','#773954','#927654','#723695','#547297','#883423','#785934','#598127','#888721','#759438',...Array.from({length:16},(_,i)=>'#'+(0x112244+i*0x030507).toString(16).padStart(6,'0'))].map(async color=>{c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,31,27);return btoa(String.fromCharCode(...new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())))}))});
 const bytes=colors.map(c=>Buffer.from(c,'base64'));
 const archive=(prefix,from,count)=>Buffer.from(zipSync(Object.fromEntries(Array.from({length:count},(_,i)=>['Database/Resources/'+prefix+'-'+i+'.png',new Uint8Array(bytes[from+i])])),{level:6}));
 const zip=archive('refresh',0,6);
 await page.locator('[data-asset-import-open]').click();await page.locator('[data-batch-package]').fill(pkg);
 await page.locator('[data-batch-files]').setInputFiles({name:'world-refresh.zip',mimeType:'application/zip',buffer:zip});
 await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await page.locator('[data-batch-production="preflight"]').click();await page.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 await page.locator('[data-batch-production-confirm]').fill('IMPORT 6 DRAFT-ASSETS');
 let release,bothWaiting;const held=new Promise(r=>release=r),bothHeld=new Promise(r=>bothWaiting=r);let requests=0,inFlight=0,maxWorkers=0;
 await page.route('**/test-storage/upload?**',async route=>{requests++;if(requests===2)bothWaiting();maxWorkers=Math.max(maxWorkers,++inFlight);try{if(requests<=2)await held;const response=await route.fetch();await route.fulfill({response})}finally{inFlight--}});
 await page.evaluate(()=>{window.authRenders=0;window.authAppShell=document.querySelector('.asset-library');const render=JMA_RENDER;JMA_RENDER=(...a)=>{authRenders++;return render(...a)}});
 await page.locator('[data-batch-production="start"]').click();
 await page.waitForFunction(()=>globalThis.assetTestUploadFiles?.length===2);await bothHeld;
 ok(requests===2,'Six-job native package-03 batch starts two uploads and leaves four jobs waiting');
 const stable=await page.evaluate(()=>{
  const s=JMA_AUTH.getState();window.oldIdentity={profile:s.profile,role:s.role,scope:s.user.id+':'+s.role,account:JSON.stringify(s.account)};window.authBefore=assetTestAuthQueries;
  window.assetTestIdentityGate=new Promise(r=>window.releaseIdentity=r);assetTestAuthEvent('TOKEN_REFRESHED');
  const next=JMA_AUTH.getState();return next.session.access_token==='fixture-refreshed-token'&&next.role==='owner';
 });
 ok(stable,'Same-user token is installed immediately without transient role loss');
 await page.waitForFunction(()=>assetTestAuthQueries>=authBefore+2);
 ok(await page.evaluate(()=>{const s=JMA_AUTH.getState();return s.profile===oldIdentity.profile&&JSON.stringify(s.account)===oldIdentity.account&&s.role===oldIdentity.role&&s.user.id+':'+s.role===oldIdentity.scope&&ASSET_LIBRARY_IMPORT.isOpen()&&authRenders===0}),'Blocked identity queries retain complete identity and open import session');
 await page.evaluate(()=>releaseIdentity());await page.waitForFunction(()=>assetTestAuthCompleted>=authBefore+2);
 await page.waitForFunction(()=>JMA_AUTH.getState().profile!==oldIdentity.profile);
 ok(await page.evaluate(()=>authRenders===0&&authAppShell===document.querySelector('.asset-library')&&ASSET_LIBRARY_IMPORT.isOpen()),'Successful unchanged TOKEN_REFRESHED performs no full app render or importer teardown');
 release();await page.waitForFunction(()=>document.querySelector('.asset-batch-footer')?.textContent.includes('ABGESCHLOSSEN'));
 const download=page.waitForEvent('download');await page.locator('[data-batch-production="report"]').click();const downloaded=await download;
 const report=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));
 ok(report.verified_assets===6&&report.errors===0&&report.phase==='ABGESCHLOSSEN','All six real ZIP jobs finish verified without pause or Analyse abgebrochen errors');
 ok(report.new_active_assets===0&&report.items.every(i=>i.verified),'All six assets are verified draft, zero automatic active');
 ok(requests===6&&maxWorkers===2&&report.items.every(i=>i.uploaded_bytes>0),'Every queued original ZIP read survives token refresh and uploads once');
 ok((await db.query('select count(*) n from asset_library where metadata->>\'import_batch\'=$1',[report.batch_id])).rows[0].n===6,'Native batch creates exactly six draft rows');
 ok(await page.evaluate(()=>assetTestUploadFiles.every(({file,options})=>file.type==='image/png'&&options.contentType==='image/png'&&options.upsert===false)),'Central verified PNG MIME and no-upsert hotfix remain active');
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'1920px importer remains visible without overflow');
 await page.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'batch-auth-1920.png')});
 await page.unroute('**/test-storage/upload?**');
 // The analysis signal must be explicitly used only while analyzing.
 const load=async(p,buffer)=>p.evaluate(async({b64,pkg})=>{
  window.oldAnalysis=new AbortController();window.a=await ASSET_LIBRARY_IMPORT.analyze({files:[new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'world.zip')],sourcePackage:pkg,signal:oldAnalysis.signal});
 },{b64:buffer.toString('base64'),pkg});
 const ready=async p=>p.evaluate(async()=>{window.b=ASSET_LIBRARY_IMPORT.createProductionBatch(a,await JMA_ASSET_STORE.batchPreflight(),batch=>{window.maxActive=Math.max(window.maxActive||0,batch.active)});return b.plan});
 const run=async p=>p.evaluate(async()=>{await b.run('IMPORT '+b.plan.remaining+' DRAFT-ASSETS');return b.report()});
 await load(page,archive('independent',6,2));await ready(page);
 ok(await page.evaluate(async()=>{oldAnalysis.abort();const preview=new AbortController();const previewRead=a.items[0].read(preview.signal);preview.abort();let blocked=false;try{await previewRead}catch(e){blocked=e.name==='AbortError'}const f=await a.items[0].read();return blocked&&f.size===a.items[0].size&&f.type===''}),'Aborted explicit preview read is isolated; no-signal production read survives aborted analysis and keeps original empty ZIP MIME');
 const independent=await run(page);
 ok(independent.verified_assets===2&&independent.errors===0&&await page.evaluate(()=>maxActive===2),'Production batch after old analysis abort completes with exactly two workers');
 // Preserve the real open-draft ID and staged object; create it through the same save path.
 const pendingZip=Buffer.from(zipSync({'Database/Resources_Materials/Inferior Copper Pickaxe.png':new Uint8Array(bytes[8])},{level:6}));
 await load(page,pendingZip);await page.evaluate(()=>{a.items[0].id='asset-226412b7-6c74-4091-a6b8-abfb9a26db86'});await ready(page);
 await page.route('**/test-db',route=>{const q=route.request().postDataJSON();if(q.action==='update'&&q.payload.storage_path)return route.fulfill({json:{data:null,error:{status:503,message:'Injected open attachment'}}});return route.continue()});
 const beforePending=metrics().uploads,pending=await run(page);await page.unroute('**/test-db');
 ok(pending.phase==='PAUSIERT'&&pending.storage_attachment_open.length===1&&pending.storage_attachment_open[0].upload_confirmed,'Confirmed Storage upload with failed attach leaves one resumable import_pending');
 const openId=pending.items[0].id;
 let row=(await db.query('select * from asset_library where id=$1',[openId])).rows[0];const stagedPath=row.metadata.import_pending.storage_path,revision=row.revision;
 ok(openId==='asset-226412b7-6c74-4091-a6b8-abfb9a26db86'&&row.status==='draft'&&!row.storage_path&&metrics().uploads===beforePending+1&&objectBytes.has('archive-assets/'+stagedPath),'Open draft keeps exact ID, revision and existing private object');
 // Re-open from freshly read originals, like the next real live preflight.
 await load(page,pendingZip);const plan=await ready(page);
 ok(plan.resumable_drafts===1&&await page.evaluate(id=>b.plan.jobs[0].row.id===id,openId),'Fresh preflight resumes existing open attachment rather than inserting a new ID');
 const beforeResume=metrics().uploads,resumed=await run(page);row=(await db.query('select * from asset_library where id=$1',[openId])).rows[0];
 ok(resumed.resumed_drafts===1&&resumed.verified_assets===1&&metrics().uploads===beforeResume&&resumed.uploaded_total_bytes===0,'Matching staged SHA only attaches existing object: zero second Storage uploads');
 ok(row.storage_path===stagedPath&&!row.metadata.import_pending&&row.status==='draft'&&row.revision===revision+1,'Resume clears pending metadata, keeps original path/ID and advances draft revision once');
 ok((await db.query('select count(*) n from asset_library where metadata->>\'source_path\'=$1',[row.metadata.source_path])).rows[0].n===1,'Resume creates no duplicate asset row');
 await load(page,archive('wrong-pending',9,1));await ready(page);
 await page.route('**/test-db',route=>{const q=route.request().postDataJSON();return q.action==='update'&&q.payload.storage_path?route.fulfill({json:{data:null,error:{status:503,message:'Open attachment'}}}):route.continue()});
 const wrong=await run(page);await page.unroute('**/test-db');
 const wrongRow=(await db.query('select * from asset_library where id=$1',[wrong.items[0].id])).rows[0];objectBytes.set('archive-assets/'+wrongRow.metadata.import_pending.storage_path,bytes[0]);
 await load(page,archive('wrong-pending',9,1));await ready(page);const beforeWrong=metrics().uploads,wrongResume=await run(page);
 ok(wrongResume.phase==='PAUSIERT'&&wrongResume.conflicts===1&&metrics().uploads===beforeWrong,'Different staged-object SHA causes conflict/STOPP, no reupload or overwrite');
 ok(!(await db.query('select storage_path from asset_library where id=$1',[wrong.items[0].id])).rows[0].storage_path,'SHA conflict leaves failed draft unattached');
 // Scope guards must still stop a batch for true auth changes, including a role
 // change with the SAME user ID. An older delayed identity query cannot undo logout.
 for(const [index,kind] of ['logout','user','role','failed_refresh'].entries()){
  const p=await pageFor('owner');p.on('pageerror',e=>errors.push(e.message));await load(p,archive('guard-'+kind,12+4*index,4));await ready(p);
  let releaseGuard;const gate=new Promise(r=>releaseGuard=r);let calls=0;
  await p.route('**/test-storage/upload?**',async r=>{calls++;await gate;await r.continue()});
  await p.evaluate(()=>{window.guardRun=b.run('IMPORT '+b.plan.remaining+' DRAFT-ASSETS')});await p.waitForFunction(()=>b.active===2&&globalThis.assetTestUploadFiles?.length===2);
  if(kind==='logout'){
   await p.evaluate(()=>{window.assetTestIdentityGate=new Promise(r=>window.releaseOldIdentity=r);window.oldQueries=assetTestAuthQueries;assetTestAuthEvent('TOKEN_REFRESHED')});
   await p.waitForFunction(()=>assetTestAuthQueries>=oldQueries+2);
   ok(await p.evaluate(()=>{assetTestAuthEvent('SIGNED_OUT',null);return !JMA_AUTH.getState().session&&!JMA_AUTH.getState().role}),'Real logout clears authenticated scope immediately while older refresh is waiting');
   await p.evaluate(()=>releaseOldIdentity());
  }else if(kind==='user'){
   ok(await p.evaluate(()=>{assetTestAuthEvent('SIGNED_IN','admin');return JMA_AUTH.getState().role===null}),'Different user invalidates previous privileges immediately');
   await p.waitForFunction(()=>JMA_AUTH.getState().role==='admin');
  }else if(kind==='role'){
   const id=await p.evaluate(()=>JMA_AUTH.getState().user.id);await p.evaluate(()=>assetTestAuthEvent('TOKEN_REFRESHED','admin',true));
   await p.waitForFunction(()=>JMA_AUTH.getState().role==='admin');
   ok(await p.evaluate(id=>JMA_AUTH.getState().user.id===id&&JMA_AUTH.getState().role==='admin',id),'Real role change is committed on the same user ID');
  }else{
   await p.evaluate(()=>{assetTestIdentityError=true;assetTestAuthEvent('TOKEN_REFRESHED')});await p.waitForFunction(()=>!JMA_AUTH.getState().role);
   ok(true,'Failed identity refresh fails closed rather than preserving stale privileges');
  }
  releaseGuard();const stopped=await p.evaluate(async()=>{await guardRun;return b.report()});
  ok(stopped.phase==='PAUSIERT'&&calls===2&&stopped.items.some(i=>i.status==='WARTET'),'True '+kind+' stops remaining queue, at most two uploads already in flight');
  ok(stopped.storage_attachment_open.length===2&&stopped.verified_assets===0&&(await db.query("select status from asset_library where metadata->>'import_batch'=$1",[stopped.batch_id])).rows.every(r=>r.status==='draft'),'True '+kind+' preserves safe pending attachments instead of publishing');
  if(kind==='logout')ok(await p.evaluate(()=>!JMA_AUTH.getState().user&&!JMA_AUTH.getState().role),'Superseded refresh cannot restore logged-out user');
 }
 const mobile=await pageFor('owner',390);mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.locator('[data-asset-import-open]').click();await mobile.locator('[data-batch-package]').fill(pkg);
 await mobile.locator('[data-batch-files]').setInputFiles({name:'mobile-world.zip',mimeType:'application/zip',buffer:archive('mobile',10,2)});
 await mobile.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await mobile.locator('[data-batch-production="preflight"]').click();await mobile.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 await mobile.evaluate(()=>{window.mobileShell=document.querySelector('.asset-library');window.beforeMobile=assetTestAuthCompleted;assetTestAuthEvent('TOKEN_REFRESHED')});
 await mobile.waitForFunction(()=>assetTestAuthCompleted>=beforeMobile+2);
 ok(await mobile.evaluate(()=>ASSET_LIBRARY_IMPORT.isOpen()&&mobileShell===document.querySelector('.asset-library')&&document.documentElement.scrollWidth<=innerWidth),'390px same-user refresh preserves importer and preflight without overflow');
 await mobile.locator('[data-batch-production-confirm]').fill('IMPORT 2 DRAFT-ASSETS');
 ok(!await mobile.locator('[data-batch-production="start"]').isDisabled(),'390px exact draft confirmation remains usable after refresh');
 ok(await mobile.locator('.asset-batch-footer button').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=44)),'390px controls preserve 44px touch targets');
 await mobile.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await mobile.screenshot({path:path.join(out,'batch-auth-390.png')});
 ok(errors.length===0,'No Chromium exceptions during refresh, resume or auth-stop tests');
 fs.writeFileSync(path.join(out,'batch-auth-fixture-report.json'),JSON.stringify({checks,production_writes:0,native_batch:report},null,2));
 console.log(JSON.stringify({checks,isolated_fixtures:true,production_writes:0}));
};
