// Existing Chromium/PGlite/Storage adapter only. Never production writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {zipSync}=require('../vendor/fflate-0.8.2.min.js');
module.exports=async({db,pageFor,metrics,out,objectBytes})=>{
 let checks=0;const ok=(x,label)=>{assert.ok(x,label);console.log('PASS BATCH UPLOAD',++checks,label)};
 await db.query("insert into asset_library(id,name,asset_type,category,status,metadata) values('private-preflight-proof','Private fixture','image','profile','archived','{}')");
 const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const colors=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=24;c.height=24;return Promise.all(['red','blue','green','purple'].map(async color=>{c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,24,24);return btoa(String.fromCharCode(...new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())))}))});
 const png=colors.map(c=>Buffer.from(c,'base64')),pkg='OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip',sha=png.map(b=>crypto.createHash('sha256').update(b).digest('hex'));
 async function analyze(name,bytes=png[0]){
  return page.evaluate(async({name,b64,pkg})=>{
   const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name);window.uploadAnalysis=await ASSET_LIBRARY_IMPORT.analyze({files:[file],sourcePackage:pkg,known:[]});
   return ASSET_LIBRARY_IMPORT.report(uploadAnalysis);
  },{name,b64:bytes.toString('base64'),pkg});
 }
 async function ready(){return page.evaluate(async()=>{window.uploadProof=await JMA_ASSET_STORE.batchPreflight();window.uploadBatch=ASSET_LIBRARY_IMPORT.createProductionBatch(uploadAnalysis,uploadProof);return uploadBatch.plan})}
 const run=()=>page.evaluate(async()=>{await uploadBatch.run('IMPORT '+uploadBatch.plan.remaining+' DRAFT-ASSETS');return uploadBatch.report()});
 ok((await page.evaluate(()=>JMA_ASSET_STORE.batchPreflight())).private_rows>0,'Fresh preflight reads actual private rows and exact paginated live count');
 await analyze('avatar-new.png');await ready();let report=await run();
 ok(report.new_imported===1&&report.verified_assets===1&&report.uploaded_total_bytes===png[0].length,'One normal original candidate uploads, attaches and is live verified');
 ok(report.new_active_assets===0&&(await db.query('select status from asset_library where id=$1',[report.items[0].id])).rows[0].status==='draft','New production-path fixture remains draft; zero new active assets');
 const first=report.items[0].id;
 await analyze('avatar-new.png');let plan=await ready();ok(plan.already_present===1&&plan.remaining===0,'Complete source/SHA entry is skipped after a fresh reload');
 const bytesBefore=metrics().uploads;await run();ok(metrics().uploads===bytesBefore,'Already present file performs no second Storage write');
 await analyze('avatar-resume.png',png[1]);const resumable=await page.evaluate(()=>ASSET_LIBRARY_IMPORT.candidate(uploadAnalysis.items[0]));
 await db.query('insert into asset_library(id,name,asset_type,category,status,metadata) values($1,$2,$3,$4,$5,$6)',[resumable.id,resumable.name,resumable.asset_type,resumable.category,'draft',resumable.metadata]);
 plan=await ready();ok(plan.resumable_drafts===1&&plan.remaining===1,'Image-less matching draft is resumable, not falsely counted as fully imported');report=await run();
 ok(report.resumed_drafts===1&&report.items[0].id===resumable.id&&report.verified_assets===1,'Resume reuses existing ID and revision and attaches the image');
 await analyze('avatar-conflict.png',png[2]);
 const cases=await page.evaluate(({sha})=>{const item=uploadAnalysis.items[0],base={id:'other',asset_type:item.asset_type,category:item.category,status:'draft',revision:1,storage_path:null,file_ref:null,metadata:{source_package:item.source_package,source_path:item.source_path,sha256:item.sha256}};return {
  wrong:ASSET_LIBRARY_IMPORT.buildBatchPlan(uploadAnalysis,[{...base,metadata:{...base.metadata,sha256:sha}}]),
  duplicate:ASSET_LIBRARY_IMPORT.buildBatchPlan(uploadAnalysis,[base,{...base,id:'second'}])};},{sha:sha[1]});
 const replaced=await page.evaluate(({sha})=>{const item=uploadAnalysis.items[0],row={id:'edited-image',asset_type:item.asset_type,category:item.category,status:'active',file_ref:'assets/branding/once-human-logo.png',metadata:{source_package:item.source_package,source_path:item.source_path,sha256:item.sha256,upload:{sha256:sha}}};return ASSET_LIBRARY_IMPORT.buildBatchPlan(uploadAnalysis,[row])},{sha:sha[1]});
 ok(replaced.conflicts===1&&replaced.already_present===0,'An edited stored image uses its actual upload SHA rather than stale source SHA and is never overwritten');
 ok(cases.wrong.conflicts===1&&cases.wrong.remaining===0,'Same source path with different SHA is a conflict');
 ok(cases.duplicate.conflicts===1&&cases.duplicate.remaining===0,'Multiple incomplete exact matches cannot be resumed automatically');
 const zip=Buffer.from(zipSync({'Avatars/a.png':new Uint8Array(png[2]),'Duplicates/copy.png':new Uint8Array(png[2]),'Opaque/review.png':new Uint8Array(png[3]),'OnceHuman_CMS_v2_Manifest.csv':new TextEncoder().encode('source_path,asset_type,category,review\nOpaque/review.png,,,1\n')}));
 await analyze('pilot-fixture.zip',zip);
 const filtered=await page.evaluate(()=>{const review=uploadAnalysis.items.find(i=>i.review);review.manualClassification={type:'avatar',category:'profile'};review.asset_type='avatar';review.category='profile';review.review=false;review.include=true;const covered=uploadAnalysis.items.find(i=>i.duplicate_state==='covered');covered.include=true;return ASSET_LIBRARY_IMPORT.buildBatchPlan(uploadAnalysis,[])});
 ok(filtered.remaining===1&&filtered.review_excluded===1,'Original Review CSV excludes manually retyped Review content; manually included covered copy stays excluded');
 await analyze('avatar-sha-change.png',png[3]);await ready();const mutationBefore=Number((await db.query('select count(*) n from asset_library')).rows[0].n);
 await page.evaluate(b64=>{uploadAnalysis.items[0].read=async()=>new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'avatar-sha-change.png')},colors[2]);report=await run();
 ok(report.errors===1&&Number((await db.query('select count(*) n from asset_library')).rows[0].n)===mutationBefore,'Original SHA recheck fails before any draft reservation or Storage write');
 await analyze('avatar-storage-fail.png',png[3]);await ready();await page.evaluate(()=>sessionStorage.setItem('test-upload-fail','yes'));report=await run();
 ok(report.errors===1&&report.phase==='PAUSIERT'&&report.storage_attachment_open.length===1&&!report.storage_attachment_open[0].upload_confirmed,'Storage error pauses batch and preserves its reserved path; never claims successful bytes');
 await page.evaluate(()=>uploadBatch.retry(uploadBatch.plan.jobs[0].item.id));report=await run();ok(report.resumed_drafts===1&&report.verified_assets===1,'Retry resumes reservation without a second draft and uploads unchanged bytes');
 // Attachment transient error retries the same object, never re-uploads it.
 await analyze('avatar-attach-transient.png',png[2]);await ready();let rejected=0;
 await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(q.action==='update'&&q.payload.storage_path&&rejected++===0)return route.fulfill({json:{data:null,error:{status:503,message:'Transient attachment'}}});return route.continue()});
 const startUploads=metrics().uploads;report=await run();await page.unroute('**/test-db');
 ok(report.verified_assets===1&&metrics().uploads===startUploads+1&&rejected>=2,'Transient attach is retried with backoff using the same Storage object');
 // Failed attachment remains recoverable across page reload via persisted upload intent.
 await analyze('avatar-attach-open.png',png[1]);await ready();
 // The prior blue image is already present: use a different source plus a genuinely new PNG.
 const extra=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=27;c.height=23;c.getContext('2d').fillStyle='orange';c.getContext('2d').fillRect(0,0,27,23);return btoa(String.fromCharCode(...new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer()))) });
 await analyze('avatar-attach-open.png',Buffer.from(extra,'base64'));await ready();
 await page.route('**/test-db',route=>{const q=route.request().postDataJSON();return q.action==='update'&&q.payload.storage_path?route.fulfill({json:{data:null,error:{status:503,message:'Repeated attachment failure'}}}):route.continue()});
 const openBefore=metrics().uploads;report=await run();await page.unroute('**/test-db');
 ok(report.phase==='PAUSIERT'&&report.errors===1&&report.storage_attachment_open[0].upload_confirmed&&objectBytes.has('archive-assets/'+report.storage_attachment_open[0].storage_path),'After upload and failed attach, exact retained private Storage path is reported and batch pauses');
 const openId=report.items[0].id;await page.reload();await page.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));
 await analyze('avatar-attach-open.png',Buffer.from(extra,'base64'));plan=await ready();report=await run();
 ok(plan.resumable_drafts===1&&report.resumed_drafts===1&&report.items[0].id===openId&&metrics().uploads===openBefore+1,'Reload plus repeated selection recovers the existing staged object, same ID, no duplicate upload');
 // Response lost after successful attach: fresh read confirms success.
 const makeColor=async color=>page.evaluate(async color=>{const c=document.createElement('canvas');c.width=29;c.height=25;c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,29,25);return btoa(String.fromCharCode(...new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())))},color);
 const lost=await makeColor('teal');await analyze('avatar-response-lost.png',Buffer.from(lost,'base64'));await ready();let intercepted=false;
 await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(q.action==='update'&&q.payload.storage_path&&!intercepted){intercepted=true;await route.fetch();return route.fulfill({json:{data:null,error:{status:503,message:'Lost response after commit'}}})}return route.continue()});
 report=await run();await page.unroute('**/test-db');ok(report.verified_assets===1&&intercepted,'Successful attach with lost response is recognized by fresh row read');
 // Four unique jobs, pause while two are running, then resume remaining jobs.
 const many={};for(let i=0;i<4;i++)many['Avatars/pause-'+i+'.png']=new Uint8Array(Buffer.from(await makeColor(['pink','yellow','brown','black'][i]),'base64'));
 await analyze('pause.zip',Buffer.from(zipSync(many)));await ready();let inFlight=0,maxFlight=0,requests=0;
 await page.route('**/test-storage/upload?**',async route=>{requests++;maxFlight=Math.max(maxFlight,++inFlight);await new Promise(r=>setTimeout(r,200));await route.continue();inFlight--});
 await page.evaluate(()=>{window.pausingRun=uploadBatch.run('IMPORT '+uploadBatch.plan.remaining+' DRAFT-ASSETS')});await page.waitForFunction(()=>uploadBatch.plan.jobs.some(j=>j.status==='UPLOAD'));await page.evaluate(()=>uploadBatch.requestPause());
 report=await page.evaluate(async()=>{await pausingRun;return uploadBatch.report()});ok(report.phase==='PAUSIERT'&&requests<=2&&maxFlight<=2&&report.items.some(i=>i.status==='WARTET'),'Pause starts no further jobs, drains at most two active uploads');
 report=await run();await page.unroute('**/test-storage/upload?**');ok(report.verified_assets===4&&maxFlight<=2&&report.new_active_assets===0,'Resume uploads remaining fixed approved set with at most two workers');
 // Pause while decoding/validation has started must not launch a new upload/reservation afterward.
 const delayed=await makeColor('lightcyan');await analyze('avatar-pause-validation.png',Buffer.from(delayed,'base64'));await ready();
 await page.evaluate(()=>{const i=uploadAnalysis.items[0],read=i.read;i.read=async()=>{await new Promise(r=>setTimeout(r,200));return read()}});
 const pauseCount=Number((await db.query('select count(*) n from asset_library')).rows[0].n),pauseUploads=metrics().uploads;
 await page.evaluate(()=>{window.validationRun=uploadBatch.run('IMPORT '+uploadBatch.plan.remaining+' DRAFT-ASSETS')});await page.waitForFunction(()=>uploadBatch.active>0);await page.evaluate(()=>uploadBatch.requestPause());await page.evaluate(()=>validationRun);
 ok(metrics().uploads===pauseUploads&&Number((await db.query('select count(*) n from asset_library')).rows[0].n)===pauseCount&&await page.evaluate(()=>uploadBatch.plan.jobs[0].status==='WARTET'),'Pause during validation keeps the job waiting and performs no new reservation/upload');
 report=await run();ok(report.verified_assets===1,'A job paused during validation can resume normally');
 // Loss of permission after preflight pauses instead of attempting the remaining queue.
 const deniedEntries={};for(let i=0;i<4;i++)deniedEntries['Avatars/denied-'+i+'.png']=new Uint8Array(Buffer.from(await makeColor(['darkcyan','darkviolet','darkgoldenrod','darkslateblue'][i]),'base64'));
 await analyze('denied.zip',Buffer.from(zipSync(deniedEntries)));await ready();let deniedRequests=0;
 await page.route('**/test-db',route=>{const q=route.request().postDataJSON();if(q.action==='insert'){deniedRequests++;return route.fulfill({json:{data:null,error:{code:'42501',message:'permission denied by row-level security'}}})}return route.continue()});
 report=await run();await page.unroute('**/test-db');ok(report.phase==='PAUSIERT'&&deniedRequests<=2&&report.items.some(i=>i.status==='WARTET'),'Revoked write permission pauses the fixed queue without mass retries');
 await analyze('avatar-scope-guard.png',Buffer.from(await makeColor('salmon'),'base64'));await ready();const scopeCount=Number((await db.query('select count(*) n from asset_library')).rows[0].n);
 const blockedScope=await page.evaluate(async b64=>{const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'avatar-scope-guard.png'),item=uploadAnalysis.items[0];try{await JMA_ASSET_STORE.saveBatch(ASSET_LIBRARY_IMPORT.candidate(item),null,file,{sha256:item.sha256,scope:'different-user:owner'});return false}catch(e){return e.message.includes('Sitzung')}},await makeColor('salmon'));
 ok(blockedScope&&Number((await db.query('select count(*) n from asset_library')).rows[0].n)===scopeCount,'Store rejects a changed authenticated scope before reserving or uploading');
 // Native existing admin UI: explicit confirmation, read-only preflight, responsive regression.
 const mobile=await pageFor('owner',390);mobile.on('pageerror',e=>errors.push(e.message));await mobile.locator('[data-asset-import-open]').click();
 const uiBytes=Buffer.from(await makeColor('navy'),'base64');await mobile.locator('[data-batch-files]').setInputFiles({name:'avatar-ui.png',mimeType:'image/png',buffer:uiBytes});await mobile.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 ok(await mobile.locator('[data-batch-production="start"]').isDisabled(),'Native UI cannot start without preflight');
 await mobile.locator('[data-batch-production="preflight"]').click();await mobile.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 ok(await mobile.locator('[data-batch-production="start"]').isDisabled(),'Successful preflight alone does not authorize writes');
 await mobile.locator('[data-batch-production-confirm]').fill('IMPORT 2 DRAFT-ASSETS');ok(await mobile.locator('[data-batch-production="start"]').isDisabled(),'Wrong numeric confirmation leaves start locked');
 await mobile.locator('[data-batch-production-confirm]').fill('IMPORT 1 DRAFT-ASSETS');ok(!await mobile.locator('[data-batch-production="start"]').isDisabled(),'Exact displayed confirmation enables only the current approved amount');
 await mobile.locator('[data-batch-production="start"]').click();await mobile.waitForFunction(()=>document.querySelector('.asset-batch-footer')?.textContent.includes('ABGESCHLOSSEN'));
 ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px production controls and counts fit without overflow');
 ok(await mobile.locator('.asset-batch-footer button').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=44)),'390px production controls retain touch target height');
 await mobile.waitForSelector('.asset-batch-footer[aria-busy="false"]');await mobile.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await mobile.screenshot({path:path.join(out,'batch-upload-mobile.png'),fullPage:true});
 await page.locator('[data-asset-import-open]').click();await page.locator('[data-batch-files]').setInputFiles({name:'avatar-desktop.png',mimeType:'image/png',buffer:Buffer.from(await makeColor('coral'),'base64')});await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));await page.locator('[data-batch-production="preflight"]').click();await page.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));await page.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'batch-upload-desktop.png')});
 const cap=await page.evaluate(()=>{const a={...uploadAnalysis,items:Array.from({length:1084},(_,i)=>({...uploadAnalysis.items[0],id:'asset-cap-'+i,source_path:'Avatars/cap-'+i+'.png',original_name:'cap-'+i+'.png',sha256:i.toString(16).padStart(64,'0'),include:true,review:false,duplicate_state:'',exact_duplicate:false})),manifests:[]};try{ASSET_LIBRARY_IMPORT.buildBatchPlan(a,[]);return false}catch(e){return e.message.includes('maximal 1.083')}});
 ok(cap,'Preflight blocks any live plan exceeding the confirmed 1083-image ceiling');
 // Fail closed on missing session, bucket, exact count, private access or migration.
 await page.evaluate(()=>sessionStorage.setItem('test-auth-unavailable','yes'));
 ok(await page.evaluate(async()=>{try{await JMA_ASSET_STORE.batchPreflight();return false}catch(e){return e.message.includes('Live-Sitzung')}}),'Expired real-session check blocks preflight');await page.evaluate(()=>sessionStorage.removeItem('test-auth-unavailable'));
 await page.evaluate(()=>sessionStorage.setItem('test-storage-unavailable','yes'));
 ok(await page.evaluate(async()=>{try{await JMA_ASSET_STORE.batchPreflight();return false}catch(e){return e.message.includes('archive-assets')}}),'Unreadable bucket blocks preflight');await page.evaluate(()=>sessionStorage.removeItem('test-storage-unavailable'));
 for(const mode of ['count','private','columns']){
  await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(q.table==='asset_library'&&q.action==='select'&&q.exact){const response=await route.fetch(),body=await response.json();if(mode==='count')delete body.count;if(mode==='private'){body.data=body.data.filter(r=>r.status==='active');body.count=body.data.length}if(mode==='columns')for(const row of body.data)delete row.storage_path;return route.fulfill({json:body})}return route.continue()});
  ok(await page.evaluate(async mode=>{try{await JMA_ASSET_STORE.batchPreflight();return false}catch(e){return e.message.includes(mode==='count'?'unvollständig':mode==='private'?'Privater':'Migration')}},mode),'Preflight refuses '+mode+' inventory proof');await page.unroute('**/test-db');
 }
 // Respect a smaller API page cap and refuse duplicate IDs instead of accepting a partial inventory.
 await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(q.exact){const r=await route.fetch(),body=await r.json();body.data=body.data.slice(0,10);return route.fulfill({json:body})}return route.continue()});
 const paged=await page.evaluate(()=>JMA_ASSET_STORE.batchPreflight());await page.unroute('**/test-db');ok(paged.rows.length===Number((await db.query('select count(*) n from asset_library')).rows[0].n),'Strict pagination adapts to a smaller API page limit and still reads all private rows');
 await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(q.exact){const r=await route.fetch(),body=await r.json();body.data[1]={...body.data[0]};return route.fulfill({json:body})}return route.continue()});
 ok(await page.evaluate(async()=>{try{await JMA_ASSET_STORE.batchPreflight();return false}catch(e){return e.message.includes('wiederholte IDs')}}),'Duplicate IDs in paged responses cannot masquerade as a complete inventory');await page.unroute('**/test-db');
 // Double start while awaiting live checks cannot create a second worker pool.
 const double=await makeColor('silver');await analyze('avatar-double-start.png',Buffer.from(double,'base64'));await ready();const doubleBefore=metrics().uploads;
 await page.evaluate(async()=>{const text='IMPORT '+uploadBatch.plan.remaining+' DRAFT-ASSETS';await Promise.all([uploadBatch.run(text),uploadBatch.run(text)])});ok(metrics().uploads===doubleBefore+1,'Repeated start cannot race into two upload pools');
 // Stop during preflight/navigation prevents even the first write.
 const preflightStop=await makeColor('olive');await analyze('avatar-stop-before-upload.png',Buffer.from(preflightStop,'base64'));await ready();
 await page.route('**/test-db',async route=>{const q=route.request().postDataJSON();if(q.exact)await new Promise(r=>setTimeout(r,100));return route.continue()});
 const stoppedBefore=metrics().uploads;await page.evaluate(()=>{window.stopRun=uploadBatch.run('IMPORT '+uploadBatch.plan.remaining+' DRAFT-ASSETS');uploadBatch.stop()});await page.evaluate(()=>stopRun);await page.unroute('**/test-db');ok(metrics().uploads===stoppedBefore&&await page.evaluate(()=>uploadBatch.phase==='PAUSIERT'),'Stop/navigation during preflight cancels new job launch');
 const errorMobile=await pageFor('owner',390);errorMobile.on('pageerror',e=>errors.push(e.message));await errorMobile.locator('[data-asset-import-open]').click();
 await errorMobile.locator('[data-batch-files]').setInputFiles({name:'avatar-mobile-error.png',mimeType:'image/png',buffer:Buffer.from(await makeColor('violet'),'base64')});await errorMobile.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));await errorMobile.locator('[data-batch-production="preflight"]').click();await errorMobile.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));await errorMobile.locator('[data-batch-production-confirm]').fill('IMPORT 1 DRAFT-ASSETS');await errorMobile.evaluate(()=>sessionStorage.setItem('test-upload-fail','yes'));await errorMobile.locator('[data-batch-production="start"]').click();await errorMobile.waitForFunction(()=>document.querySelector('.asset-batch-footer[aria-busy="false"]')?.textContent.includes('PAUSIERT'));
 ok(await errorMobile.locator('[data-batch-retry]').isVisible()&&await errorMobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px failed-upload retry control is visible without overflow');
 ok(await errorMobile.locator('[data-batch-retry]').evaluate(e=>e.getBoundingClientRect().height>=44),'390px individual retry retains a 44px touch target');await errorMobile.screenshot({path:path.join(out,'batch-upload-mobile-error.png'),fullPage:true});
 // Native reload passes the existing library inventory to analysis, including incomplete drafts.
 const mobileDraft=(await db.query("select id from asset_library where metadata->>'source_path'='avatar-mobile-error.png'")).rows[0].id;
 await errorMobile.reload();await errorMobile.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));
 await errorMobile.locator('[data-asset-import-open]').click();await errorMobile.locator('[data-batch-files]').setInputFiles({name:'avatar-mobile-error.png',mimeType:'image/png',buffer:Buffer.from(await makeColor('violet'),'base64')});await errorMobile.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await errorMobile.locator('[data-batch-production="preflight"]').click();await errorMobile.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 ok(await errorMobile.locator('.asset-batch-footer').innerText().then(t=>/Resumierbare Drafts\s+1/.test(t)),'Native ZIP reselection with the loaded library keeps an image-less reservation eligible for resume');
 await errorMobile.locator('[data-batch-production-confirm]').fill('IMPORT 1 DRAFT-ASSETS');await errorMobile.locator('[data-batch-production="start"]').click();await errorMobile.waitForFunction(()=>document.querySelector('.asset-batch-footer[aria-busy="false"]')?.textContent.includes('ABGESCHLOSSEN'));
 const mobileResumed=(await db.query("select id,status,storage_path from asset_library where metadata->>'source_path'='avatar-mobile-error.png'")).rows;
 ok(mobileResumed.length===1&&mobileResumed[0].id===mobileDraft&&mobileResumed[0].status==='draft'&&mobileResumed[0].storage_path,'Native reload resume attaches to the same draft without inserting a second record');
 const sourceWrong=await page.evaluate(()=>{try{ASSET_LIBRARY_IMPORT.buildBatchPlan({...uploadAnalysis,sourcePackage:'other.zip'},[]);return false}catch(e){return e.message.includes('Cosmetic-Pilot')}});ok(sourceWrong,'Other ZIP packages cannot enter the production path');
 ok(errors.length===0,'No Chromium exceptions: '+errors.join('; '));
 fs.writeFileSync(path.join(out,'batch-upload-fixture-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks,isolated_fixtures:true,production_writes:0}));
};
