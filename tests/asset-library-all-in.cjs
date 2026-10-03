// Multi-package UI/controller tests in the existing local PostgreSQL/Storage harness.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {zipSync}=require('../vendor/fflate-0.8.2.min.js');
module.exports=async({db,pageFor,metrics,out,objectBytes})=>{
 let checks=0;const ok=(x,label)=>{assert.ok(x,label);console.log('PASS ALL-IN',++checks,label)};
 const pkg=n=>'OnceHuman_CMS_v2_'+({1:'01_Profile_Cosmetics_Shop',5:'05_Building_Other_Vehicles',6:'06_Additional',7:'07_Broken',8:'08_Damaged_Member',90:'90_Unclear_Needs_Review'}[n])+'.zip';
 await db.query("insert into asset_library(id,name,asset_type,category,status,metadata) values('all-in-private-proof','Private fixture','image','profile','archived','{}')");
 const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const b64s=await page.evaluate(()=>Array.from({length:16},(_,i)=>{const c=document.createElement('canvas');c.width=27;c.height=23;c.getContext('2d').fillStyle='#'+(0x234567+i*0x040302).toString(16).padStart(6,'0');c.getContext('2d').fillRect(0,0,27,23);return c.toDataURL('image/png').split(',')[1]}));
 const bytes=b64s.map(s=>Buffer.from(s,'base64')),sha=bytes.map(b=>crypto.createHash('sha256').update(b).digest('hex'));
 const zip=(files,level=6)=>Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,new Uint8Array(v)])),{level}));
 const manifestRows=[
  [1,'Same/file.png',0,'avatar','profile'],[5,'Same/file.png',1,'item','items'],[1,'Avatars/00-shared.png',2,'avatar','profile'],[5,'Avatars/zz-shared.png',2,'avatar','profile'],
  [90,'Opaque/review.png',3,'item','items'],[90,'Weapons/safe.png',4,'item','items'],[6,'Opaque/extra.png',5,'resource','resources'],[6,'Weapons/unknown.png',6,'unsupported_type','weapons'],
  [6,'Weapons/mismatch.png',7,'weapon','weapons'],[5,'Images/known.png',8,'image','website']
 ];
 const manifest=Buffer.from('source_package,source_path,sha256,asset_type,category\n'+manifestRows.map(([n,p,i,t,c])=>[pkg(n),p,p==='Weapons/mismatch.png'?sha[15]:sha[i],t,c].join(',')).join('\n')+'\n,Shared/ambiguous.png,,frame,profile\n');
 const review=Buffer.from('source_package,source_path,sha256,review\n'+[pkg(90),'Opaque/review.png',sha[3],1].join(',')+'\n');
 const damaged=zip({'Resources/bad-crc.png':bytes[14],'Resources/remainder.png':bytes[10]},0);damaged[30+Buffer.byteLength('Resources/bad-crc.png')+12]^=1;
 const inputs=[
  {name:pkg(1).replace('.zip','_Part01.zip'),buffer:zip({'Same/file.png':bytes[0],'Avatars/00-shared.png':bytes[2],'Shared/ambiguous.png':bytes[11],'script.js':Buffer.from('throw Error("NEVER EXECUTE")'),'../escape.png':bytes[0]})},
  {name:'OnceHuman_CMS_Codex_05_Building_Other_Vehicles_READY.zip',buffer:zip({'Same/file.png':bytes[1],'Avatars/zz-shared.png':bytes[2],'Images/known.png':bytes[8],'Items/conflict.png':bytes[9],'Shared/ambiguous.png':bytes[12]})},
  {name:pkg(90),buffer:zip({'Opaque/review.png':bytes[3],'Weapons/safe.png':bytes[4]})},
  {name:pkg(6),buffer:zip({'Opaque/extra.png':bytes[5],'Weapons/unknown.png':bytes[6],'Weapons/mismatch.png':bytes[7],'broken.png':Buffer.from('corrupt image'),'Local/local.png':bytes[13],'OnceHuman_CMS_v2_Manifest.csv':Buffer.from('source_path,asset_type,category\nLocal/local.png,trophy,profile\n')})},
  {name:pkg(7),buffer:Buffer.from('invalid archive')},{name:pkg(8),buffer:damaged},
  {name:'OnceHuman_CMS_v2_Manifest.csv',buffer:manifest},{name:'OnceHuman_CMS_v2_Review_Queue.csv',buffer:review}
 ];
 const wire=inputs.map(({name,buffer})=>({name,b64:buffer.toString('base64')}));
 const analyze=()=>page.evaluate(async inputs=>{
  window.analysisAbort=new AbortController();window.allAnalysis=await ASSET_LIBRARY_IMPORT.analyze({mode:'all-in',files:inputs.map(({name,b64})=>new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name)),signal:analysisAbort.signal});
  return {report:ASSET_LIBRARY_IMPORT.report(allAnalysis),items:allAnalysis.items.map(({read,...i})=>i)};
 },wire);
 const dry=await analyze(),find=(n,p)=>dry.items.find(i=>i.source_package===pkg(n)&&i.source_path===p);
 ok(dry.report.analysis_mode==='all-in'&&dry.report.packages.length===5&&dry.report.package_errors.length===1,'Five independently analyzed packages and one broken ZIP reported without losing safe content');
 ok(find(1,'Same/file.png').asset_type==='avatar'&&find(5,'Same/file.png').asset_type==='item'&&!find(1,'Same/file.png').path_duplicate&&!find(5,'Same/file.png').path_duplicate,'Same relative path in different packages has separate manifest/type namespaces');
 ok(find(90,'Weapons/safe.png').asset_type==='item'&&find(90,'Weapons/safe.png').classification_source==='manifest','Safe package-90 item honors explicit manifest over Weapons folder');
 ok(find(6,'Local/local.png').asset_type==='trophy'&&find(6,'Local/local.png').classification_source==='manifest','Unscoped internal manifest is bound to its own archive');
 ok(find(1,'Shared/ambiguous.png').review&&find(5,'Shared/ambiguous.png').review,'Unscoped external manifest with ambiguous package/path keeps both files in Review');
 ok(find(90,'Opaque/review.png').review&&find(6,'Weapons/unknown.png').review&&find(6,'Weapons/mismatch.png').review,'Explicit Review, unsupported type and mismatching manifest SHA never fall through to folder guesses');
 const duplicate=dry.items.filter(i=>i.sha256===sha[2]);
 ok(duplicate.length===2&&duplicate.filter(i=>i.include).length===1&&duplicate.find(i=>i.include).source_package===pkg(1)&&duplicate.every(i=>i.duplicate_sources.length===2&&new Set(i.duplicate_sources.map(s=>s.source_package)).size===2),'Cross-package SHA has exactly one deterministic representative and both original package sources');
 ok(dry.items.filter(i=>!i.valid).length===4&&dry.report.package_errors[0].source_package===pkg(7),'Corrupt image/CRC, traversal and script excluded individually; broken package diagnosed separately');
 ok(dry.report.per_package.length===6&&metrics().uploads===0,'Dry Run returns per-package plus total reports without uploads');
 const repeat=await page.evaluate(async inputs=>{allAnalysis=await ASSET_LIBRARY_IMPORT.analyze({mode:'all-in',previous:allAnalysis,files:inputs.map(({name,b64})=>new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name))});return ASSET_LIBRARY_IMPORT.report(allAnalysis)},wire);
 ok(repeat.total_files===dry.report.total_files&&repeat.valid_images===dry.report.valid_images&&repeat.package_errors.length===1,'Repeated ZIPs/CSVs do not double count files across the session');
 // Independent read after old analysis abort, even in a multi-package session.
 ok(await page.evaluate(async()=>{analysisAbort.abort();return (await allAnalysis.items.find(i=>i.valid).read()).size>0}),'ALL-IN production ZIP read does not inherit original analysis signal');
 const metadataSafety=await page.evaluate(async({p1,p5,b64})=>{
  const image=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./vendor/fflate-0.8.2.min.js';script.onload=resolve;script.onerror=reject;document.head.append(script)});
  const file=(name,rows)=>new File([fflate.zipSync(rows)],name);
  const good=file(p1,{'Avatars/good.png':image}),bad=file(p5,{'Avatars/local.png':image,'OnceHuman_CMS_v2_Review_Queue.csv':new TextEncoder().encode('path,review\n"open')});
  const scoped=await ASSET_LIBRARY_IMPORT.analyze({mode:'all-in',files:[good,bad]});
  const global=await ASSET_LIBRARY_IMPORT.analyze({mode:'all-in',files:[good,new File(['path,review\n"open'],'OnceHuman_CMS_v2_Review_Queue.csv')]});
  const equal=await ASSET_LIBRARY_IMPORT.analyze({mode:'all-in',files:[file(p1,{'Avatars/equal.png':image}),file(p5,{'Avatars/equal.png':image})]});
  return {local:scoped.items.find(i=>i.source_package===p5).review,good:!scoped.items.find(i=>i.source_package===p1).review,global:global.items[0].review,diagnosed:global.metadataErrors.length===1,equal:equal.items.every(i=>!i.path_duplicate)&&equal.items.filter(i=>i.include).length===1&&equal.items[0].duplicate_sources.length===2&&new Set(equal.items[0].duplicate_sources.map(s=>s.source_package)).size===2};
 },{p1:pkg(1),p5:pkg(5),b64:b64s[14]});
 ok(metadataSafety.local&&metadataSafety.good,'Broken internal Review CSV quarantines its own package while safe sibling package remains usable');
 ok(metadataSafety.global&&metadataSafety.diagnosed,'Unreadable global Review cannot silently release candidates via folder fallback');
 ok(metadataSafety.equal,'Identical path and SHA in different packages retain two distinct provenance sources and one representative');
 // Truthful existing active object and compatible non-representative draft.
 await page.evaluate(async({b64,sha,sourcePackage})=>{await JMA_ASSET_STORE.load({strict:true});await JMA_ASSET_STORE.save({id:'all-in-active-existing',name:'Existing active fixture',asset_type:'image',category:'website',status:'active',file_ref:null,catalog_id:null,sort_order:0,metadata:{source_package:sourcePackage,source_path:'Old/known.png',sha256:sha}},null,new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'known.png'))},{b64:b64s[8],sha:sha[8],sourcePackage:pkg(1)});
 const activeBefore=(await db.query("select * from asset_library where id='all-in-active-existing'")).rows[0];
 const reserved=await page.evaluate(p=>ASSET_LIBRARY_IMPORT.candidate(allAnalysis.items.find(i=>i.source_package===p&&i.source_path==='Avatars/zz-shared.png')),pkg(5));
 await db.query('insert into asset_library(id,name,asset_type,category,status,metadata) values($1,$2,$3,$4,$5,$6)',[reserved.id,reserved.name,reserved.asset_type,reserved.category,'draft',reserved.metadata]);
 await db.query('insert into asset_library(id,name,asset_type,category,status,metadata) values($1,$2,$3,$4,$5,$6)',['all-in-source-conflict','Conflict fixture','item','items','draft',{source_package:pkg(5),source_path:'Items/conflict.png',sha256:sha[7]}]);
 const plan=await page.evaluate(async()=>{window.allProof=await JMA_ASSET_STORE.batchPreflight();return ASSET_LIBRARY_IMPORT.buildBatchPlan(allAnalysis,allProof.rows)});
 ok(plan.remaining===7&&plan.new_candidates===6&&plan.resumable_drafts===1&&plan.already_present===1&&plan.conflicts===1,'Combined live preflight reduces nine selected contents to seven safe jobs, one known image and one conflict');
 const resumedJob=plan.jobs.find(j=>j.kind==='resume');
 ok(resumedJob.row.id===reserved.id&&resumedJob.item.source_package===pkg(5)&&resumedJob.item.source_path==='Avatars/zz-shared.png','Compatible draft in a covered group member resumes its actual ID/source instead of duplicating or retyping');
 const safety=await page.evaluate(()=>{
  let growth=false,solo=false,forged=false;
  try{ASSET_LIBRARY_IMPORT.buildBatchPlan(allAnalysis,allProof.rows,6)}catch(e){growth=e.message.includes('Dry-Run-Menge')}
  try{ASSET_LIBRARY_IMPORT.buildBatchPlan({...allAnalysis,mode:'single',sourcePackage:allAnalysis.packages.find(p=>p.includes('_05_'))},[])}catch(e){solo=e.message.includes('freigegeben')}
  try{ASSET_LIBRARY_IMPORT.buildBatchPlan({...allAnalysis,analyzedPackages:[]},[])}catch(e){forged=e.message.includes('analysierten ZIP')}
  const edited={...allAnalysis,items:allAnalysis.items.map(i=>i.productionReview?{...i,review:false,include:true,asset_type:'item',category:'items'}:i)};
  return {growth,solo,forged,held:ASSET_LIBRARY_IMPORT.buildBatchPlan(edited,allProof.rows,20).remaining};
 });
 ok(safety.growth&&safety.solo&&safety.forged,'Growth above Dry Run, unapproved single-package mode and unanalysed package claims block');
 ok(safety.held===plan.remaining,'Manual retyping cannot release original Review or manifest-integrity quarantine');
 const replaced=await page.evaluate(async()=>{
  const a={...allAnalysis,items:allAnalysis.items.map(i=>({...i}))},b=ASSET_LIBRARY_IMPORT.createProductionBatch(a,allProof);
  const first=a.items.find(i=>i.include&&!i.review&&i.asset_type==='resource');first.asset_type='item';
  try{await b.run('IMPORT '+b.plan.remaining+' DRAFT-ASSETS');return false}catch(e){return e.message.includes('Auswahl')}
 });
 ok(replaced,'Confirmed source/type selection cannot be swapped for another equally sized live plan');
 const cap=await page.evaluate(({p1,p5})=>{
  const base=allAnalysis.items.find(i=>i.source_package===p1&&i.source_path==='Same/file.png'),other=allAnalysis.items.find(i=>i.source_package===p5&&i.source_path==='Same/file.png');
  const a={...allAnalysis,packages:[p1,p5],analyzedPackages:[p1,p5],manifests:[],metadataErrors:[],items:[...Array.from({length:1084},(_,i)=>({...base,id:'asset-cap-'+i,source_path:'Avatars/cap-'+i+'.png',sha256:i.toString(16).padStart(64,'0'),include:true,review:false,exact_duplicate:false,duplicate_state:'',known_ids:[]})),other]};
  const plan=ASSET_LIBRARY_IMPORT.buildBatchPlan(a,allProof.rows);return {remaining:plan.remaining,conflicts:plan.conflicts};
 },{p1:pkg(1),p5:pkg(5)});
 ok(cap.remaining===1&&cap.conflicts===1084,'Existing Cosmetic cap stays effective per package without discarding the safe sibling plan (planning only)');
 // UI: one selection, one proof/confirmation and a controlled pause during refresh.
 const payload=inputs.map(({name,buffer})=>({name,buffer,mimeType:name.endsWith('.zip')?'application/zip':'text/csv'}));
 await page.locator('[data-asset-import-open]').click();await page.locator('[data-batch-mode]').selectOption('all-in');
 ok(!await page.locator('[data-batch-package]').isVisible(),'ALL-IN mode hides the single source-package control');
 await page.locator('[data-batch-files]').setInputFiles(payload);await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await page.locator('[data-batch-filter="package"]').selectOption(pkg(90));ok(await page.locator('.asset-batch-row').count()===2,'Package filter shows only package-90 safe/review entries');await page.locator('[data-batch-filter="package"]').selectOption('');
 await page.locator('[data-batch-view="review"]').click();ok(await page.locator('.asset-batch-row').count()===5,'Shared Review queue contains only five unresolved/held files');await page.locator('[data-batch-view=""]').click();
 await page.locator('[data-batch-search]').fill('06_Additional');ok(await page.locator('.asset-batch-row').count()===5,'Search includes original package provenance');await page.locator('[data-batch-search]').fill('');
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'1920px ALL-IN workspace has no horizontal overflow');
 await page.locator('[data-batch-production="preflight"]').click();await page.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 await page.locator('[data-batch-production-confirm]').fill('IMPORT 8 DRAFT-ASSETS');ok(await page.locator('[data-batch-production="start"]').isDisabled(),'Wrong total quantity is blocked');
 await page.locator('[data-batch-production-confirm]').fill('IMPORT 7 DRAFT-ASSETS');ok(!await page.locator('[data-batch-production="start"]').isDisabled(),'Exact combined preflight quantity enables the single production start');
 let release,awaitBoth;const gate=new Promise(r=>release=r),both=new Promise(r=>awaitBoth=r);let inFlight=0,maxFlight=0,uploads=0;
 await page.route('**/test-storage/upload?**',async route=>{uploads++;maxFlight=Math.max(maxFlight,++inFlight);if(uploads===2)awaitBoth();try{await gate;const response=await route.fetch();await route.fulfill({response})}finally{inFlight--}});
 let releaseProof,proofRead;const proofGate=new Promise(r=>releaseProof=r),proofHeld=new Promise(r=>proofRead=r);let holdProof=true;
 await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(holdProof&&q.action==='select'&&q.table==='asset_library'&&q.exact){holdProof=false;proofRead();await proofGate}return q.action==='update'&&q.filters.some(([k,v])=>k==='id'&&v===reserved.id)&&q.payload.storage_path?route.fulfill({json:{data:null,error:{status:503,message:'Open attachment across reload'}}}):route.continue()});
 const uploadsBefore=metrics().uploads;
 await page.evaluate(()=>{window.shellBefore=document.querySelector('.asset-library');window.authCount=assetTestAuthCompleted});
 await page.locator('[data-batch-production="start"]').click();await proofHeld;
 await page.locator('[data-batch-files]').setInputFiles(payload);await page.waitForFunction(()=>document.querySelector('[data-batch-production="start"]')?.disabled);
 ok(await page.locator('[data-batch-production-confirm]').inputValue()==='IMPORT 7 DRAFT-ASSETS'&&await page.locator('[data-batch-files]').isDisabled(),'Starting fresh preflight locks file replacement and preserves the sole approved controller');
 releaseProof();await both;await page.evaluate(()=>assetTestAuthEvent('TOKEN_REFRESHED'));await page.waitForFunction(()=>assetTestAuthCompleted>=authCount+2);
 ok(await page.evaluate(()=>ASSET_LIBRARY_IMPORT.isOpen()&&shellBefore===document.querySelector('.asset-library')&&JMA_AUTH.getState().role==='owner'),'Same-user refresh keeps running ALL-IN session and shell intact');
 await page.locator('[data-batch-production="pause"]').click();release();await page.waitForFunction(()=>document.querySelector('.asset-batch-footer')?.textContent.includes('PAUSIERT')&&document.querySelector('.asset-batch-footer')?.getAttribute('aria-busy')==='false');
 async function report(){const event=page.waitForEvent('download');await page.locator('[data-batch-production="report"]').click();return JSON.parse(fs.readFileSync(await (await event).path(),'utf8'))}
 const partial=await report();
 ok(uploads===2&&maxFlight===2&&partial.verified_assets===1&&partial.storage_attachment_open.length===1&&partial.items.some(i=>i.status==='WARTET'),'Pause/attachment failure drains two workers and preserves safe waiting jobs plus one pending object');
 ok(partial.storage_attachment_open[0].asset_id===reserved.id&&partial.storage_attachment_open[0].upload_confirmed,'Covered-origin draft keeps its existing ID and confirmed private staged object');
 await page.unroute('**/test-db');await page.unroute('**/test-storage/upload?**');
 await page.reload();await page.waitForFunction(()=>JMA_AUTH.getState().ready);await page.waitForSelector('[data-asset-import-open]');await page.locator('[data-asset-import-open]').click();
 ok(await page.locator('[data-batch-mode]').inputValue()==='all-in'&&await page.locator('.asset-batch').innerText().then(t=>t.includes('Nach Reload'))&&await page.locator('[data-batch-production="start"]').isDisabled(),'Reload restores only mode/reselection hint, never old confirmation or an auto-running queue');
 ok(await page.evaluate(()=>{const hint=JSON.parse(sessionStorage.getItem('jma_asset_import_selection'));return !hint.confirmation&&!hint.jobs&&!hint.bytes&&!hint.candidates}),'Reload hint contains no image bytes, job plan or import authorization');
 await page.locator('[data-batch-files]').setInputFiles(payload);await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await page.locator('[data-batch-production="preflight"]').click();await page.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 await page.locator('[data-batch-production-confirm]').fill('IMPORT 6 DRAFT-ASSETS');ok(!await page.locator('[data-batch-production="start"]').isDisabled(),'Fresh reload preflight skips finished content and offers five new plus one pending resume');
 const beforeResume=metrics().uploads;await page.locator('[data-batch-production="start"]').click();await page.waitForFunction(()=>document.querySelector('.asset-batch-footer')?.textContent.includes('ABGESCHLOSSEN'));
 const complete=await report();
 ok(complete.verified_assets===6&&complete.resumed_drafts===1&&complete.new_imported===5&&metrics().uploads===beforeResume+5,'Reload resumes existing Storage object without second upload and imports remaining safe candidates');
 ok(complete.errors===0&&complete.conflicts===1&&complete.storage_attachment_open.length===0&&complete.new_active_assets===0,'A diagnosed source conflict remains excluded while the safe rest finishes as draft');
 ok(complete.per_package.length===6&&complete.package_errors.length===1&&complete.items.every(i=>i.source_package)&&complete.source_package===null&&complete.excluded_files.some(i=>i.source_path==='script.js'&&!i.valid)&&complete.excluded_files.some(i=>i.source_path==='Opaque/review.png'&&i.review),'Final overall report preserves per-package provenance, excluded broken ZIP and individual errors');
 const rows=(await db.query("select * from asset_library where metadata->>'import_batch' in ($1,$2)",[partial.batch_id,complete.batch_id])).rows;
 ok(rows.length===7&&rows.every(r=>r.status==='draft'&&!r.users_available&&r.metadata.source_package!=='ALL-IN')&&rows.filter(r=>r.id===reserved.id).length===1,'Exactly seven unique resulting drafts, no duplicate existing ID and no synthetic ALL-IN source_package');
 const resumedRow=rows.find(r=>r.id===reserved.id);ok(!resumedRow.metadata.import_pending&&resumedRow.metadata.duplicate_sources.length===2&&new Set(resumedRow.metadata.duplicate_sources.map(s=>s.source_package)).size===2,'Resume clears pending and preserves cross-package duplicate origins without merging equal paths');
 ok(rows.every(r=>{const stored=objectBytes.get('archive-assets/'+r.storage_path);return stored&&bytes.some(b=>b.equals(stored))&&crypto.createHash('sha256').update(stored).digest('hex')===r.metadata.upload.sha256&&r.metadata.upload.mime==='image/png'}),'Stored originals keep exact bytes/SHA and verified MIME across all packages');
 ok(metrics().uploads===uploadsBefore+7,'Global SHA dedupe plus resume performs exactly seven image uploads in total');
 ok(JSON.stringify((await db.query("select * from asset_library where id='all-in-active-existing'")).rows[0])===JSON.stringify(activeBefore),'Previously active asset remains byte-equivalent and unchanged');
 ok((await db.query("select revision from asset_library where id='all-in-source-conflict'")).rows[0].revision===1,'Conflicting source row was never overwritten');
 await page.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'all-in-1920.png')});
 const mobile=await pageFor('owner',390);mobile.on('pageerror',e=>errors.push(e.message));await mobile.locator('[data-asset-import-open]').click();await mobile.locator('[data-batch-mode]').selectOption('all-in');await mobile.locator('[data-batch-files]').setInputFiles(payload);await mobile.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await mobile.locator('[data-batch-production="preflight"]').click();await mobile.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px multi-package analysis and preflight fit without overflow');
 ok(await mobile.locator('.asset-batch-footer button').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=44)),'390px production controls keep 44px touch targets');
 ok(await mobile.locator('[data-batch-production="start"]').isDisabled(),'Completed contents are skipped on reselect; zero safe remainder cannot launch another upload');
 await mobile.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await mobile.screenshot({path:path.join(out,'all-in-390.png')});
 ok(errors.length===0,'No Chromium exceptions during multi-package refresh/pause/reload/resume');
 fs.writeFileSync(path.join(out,'all-in-fixture-report.json'),JSON.stringify({checks,production_writes:0,dry_run:dry.report,partial,resumed:complete},null,2));
 console.log(JSON.stringify({checks,isolated_fixtures:true,production_writes:0}));
};
