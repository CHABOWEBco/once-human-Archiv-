// Explicit package approval in the existing Chromium/PGlite/Storage harness only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {zipSync}=require('../vendor/fflate-0.8.2.min.js');
module.exports=async({db,pageFor,metrics,out,objectBytes,world=false})=>{
 let checks=0;const ok=(x,label)=>{assert.ok(x,label);console.log('PASS BATCH PACKAGES',++checks,label)};
 const cosmetic='OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip',combat='OnceHuman_CMS_v2_02_Database_Combat.zip',worldPackage='OnceHuman_CMS_v2_03_Database_World_Items.zip';
 const pkg=world?worldPackage:combat,num=world?'03':'02',caption=world?'Database / World Items':'Database / Combat';
 const primaryPath=world?'Database/Items/manifest-resource.png':'Database/Weapons/rifle.png',copyPath=world?'00-Copies/resource-copy.png':'Duplicate/rifle-copy.png';
 const resumePath=world?'Database/Weapons/manifest-deviation.png':'Database/Weapons/manifest-mod.png',preparedPath=world?'Database/Resources/manifest-item.png':'Database/Opaque/prepared-item.png';
 const knownPath=world?'Database/Items/known.png':'Database/Weapons/known.png',reviewPath=world?'Database/Resources/resource-review.png':'Database/Weapons/review.png';
 await db.query("insert into asset_library(id,name,asset_type,category,status,metadata) values('package-private-proof','Private fixture','image','profile','archived','{}')");
 const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const b64s=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=24;c.height=20;
  return Promise.all(['red','blue','green','purple','orange','black'].map(color=>{c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,24,20);return new Promise(r=>c.toBlob(async blob=>r(btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())))),'image/png'))}));
 });
 const png=b64s.map(b=>Buffer.from(b,'base64')),sha=png.map(b=>crypto.createHash('sha256').update(b).digest('hex'));
 const records=[...(world?[[primaryPath,'resource','resources',sha[0]]]:[]),[resumePath,world?'deviation':'item',world?'deviations':'items',sha[1]],[preparedPath,'item','items',sha[2]]];
 const manifest=Buffer.from('source_package,source_path,asset_type,category,sha256\n'+records.map(r=>[pkg,...r].join(',')).join('\n')+'\n');
 const review=Buffer.from('source_package,source_path,review\n'+pkg+','+reviewPath+',1\n');
 const zip=Buffer.from(zipSync({[primaryPath]:new Uint8Array(png[0]),[copyPath]:new Uint8Array(png[0]),[resumePath]:new Uint8Array(png[1]),[preparedPath]:new Uint8Array(png[2]),[knownPath]:new Uint8Array(png[3]),[reviewPath]:new Uint8Array(png[4]),'Database/Opaque/mystery.png':new Uint8Array(png[5]),'OnceHuman_CMS_v2_Manifest.csv':new Uint8Array(manifest),'OnceHuman_CMS_v2_Review_Queue.csv':new Uint8Array(review)}));
 const beforeDry=Number((await db.query('select count(*) n from asset_library')).rows[0].n);
 const dry=await page.evaluate(async({b64,pkg})=>{window.packageZip=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'package-fixture.zip');window.packageAnalysis=await ASSET_LIBRARY_IMPORT.analyze({files:[packageZip],sourcePackage:pkg,known:[]});return {report:ASSET_LIBRARY_IMPORT.report(packageAnalysis),items:packageAnalysis.items.map(({read,...i})=>i)}},{b64:zip.toString('base64'),pkg});
 ok(dry.items.every(i=>i.source_package===pkg)&&dry.report.selected_unique_image_contents===4,'Package '+num+' exact source_package and four unique local Dry Run candidates');
 ok(dry.items.find(i=>i.source_path===primaryPath).asset_type===(world?'resource':'weapon')&&(!world||dry.items.find(i=>i.source_path===primaryPath).classification_source==='manifest'),world?'Manifest resource/resources overrides Items folder without filename inference':'Weapons folder uses the existing weapon type');
 const mod=dry.items.find(i=>i.source_path===resumePath);
 ok(mod.asset_type===(world?'deviation':'item')&&mod.category===(world?'deviations':'items')&&mod.classification_source==='manifest',world?'Manifest deviation/deviations overrides Weapons folder without inventing a type':'Prepared mod uses manifest item/items, overriding the Weapons folder without inventing a mod type');
 ok(dry.items.find(i=>i.source_path===preparedPath).classification_source==='manifest'&&dry.items.find(i=>i.source_path===preparedPath).asset_type==='item'&&dry.report.review===2,'Prepared database item follows manifest; explicit Review and unknown image remain unresolved');
 const duplicates=dry.items.filter(i=>i.sha256===sha[0]);
 ok(duplicates.filter(i=>i.include).length===1&&duplicates.find(i=>i.include).source_path===primaryPath&&duplicates.some(i=>i.duplicate_state==='covered')&&duplicates.every(i=>i.duplicate_sources.length===2),'SHA duplicates retain one deterministic representative and both source paths');
 ok(metrics().uploads===0&&Number((await db.query('select count(*) n from asset_library')).rows[0].n)===beforeDry,'Package '+num+' local analysis performs zero uploads and inserts');
 const limits=await page.evaluate(({cosmetic,combat,preparedPath})=>{
  const a=packageAnalysis,base=a.items.find(i=>i.source_path===preparedPath);
  const many={...a,manifests:[],items:Array.from({length:1084},(_,i)=>({...base,id:'asset-many-'+i,source_path:'Database/Items/many-'+i+'.png',original_name:'many-'+i+'.png',sha256:i.toString(16).padStart(64,'0'),include:true,review:false,exact_duplicate:false,duplicate_state:'',known_ids:[]}))};
  const plan=ASSET_LIBRARY_IMPORT.buildBatchPlan(many,[]);
  let cosmeticBlocked=false,largerBlocked=false,wrongSourceBlocked=false;
  const blockedPackages=['OnceHuman_CMS_v2_04_Building_Formulas.zip','OnceHuman_CMS_v2_05_Building_Other_Vehicles.zip','OnceHuman_CMS_v2_90_Unclear_Needs_Review.zip'].map(sourcePackage=>{try{ASSET_LIBRARY_IMPORT.buildBatchPlan({...a,sourcePackage,items:a.items.map(i=>({...i,source_package:sourcePackage}))},[]);return false}catch(e){return e.message.includes('freigegeben')}});
  try{ASSET_LIBRARY_IMPORT.buildBatchPlan({...many,sourcePackage:cosmetic,items:many.items.map(i=>({...i,source_package:cosmetic}))},[])}catch(e){cosmeticBlocked=e.message.includes('maximal 1.083')}
  try{ASSET_LIBRARY_IMPORT.buildBatchPlan(a,[],3)}catch(e){largerBlocked=e.message.includes('Dry-Run-Menge')}
  try{ASSET_LIBRARY_IMPORT.buildBatchPlan({...a,items:a.items.map(i=>({...i,source_package:cosmetic}))},[])}catch(e){wrongSourceBlocked=e.message.includes('aktuellen Paket')}
  const same=ASSET_LIBRARY_IMPORT.buildBatchPlan(a,[],4);
  const cosmeticPlan=ASSET_LIBRARY_IMPORT.buildBatchPlan({...a,sourcePackage:cosmetic,items:a.items.map(i=>({...i,source_package:cosmetic})),manifests:[]},[]);
  const combatPlan=ASSET_LIBRARY_IMPORT.buildBatchPlan({...a,sourcePackage:combat,items:a.items.map(i=>({...i,source_package:combat})),manifests:[]},[]);
  return {combatApproved:combatPlan.source_package===combat&&combatPlan.confirmed_pilot_limit===null,blockedPackages,remaining:plan.remaining,limit:plan.confirmed_pilot_limit,dry:plan.dry_run_limit,cosmeticBlocked,largerBlocked,wrongSourceBlocked,same:same.remaining,cosmeticLimit:cosmeticPlan.confirmed_pilot_limit,cosmeticMode:cosmeticPlan.report_mode};
 },{cosmetic,combat,preparedPath});
 ok(limits.remaining===1084&&limits.limit===null&&limits.dry===1084,'Package '+num+' accepts a synthetic 1084-candidate plan; no copied Cosmetic cap');
 ok(limits.cosmeticBlocked&&limits.cosmeticLimit===1083&&limits.cosmeticMode==='COSMETIC PRODUCTION BATCH','Cosmetic package retains its approval, cap and report mode');
 ok(limits.largerBlocked&&limits.same===4,'Live amount greater than captured Dry Run blocks; equal amount is allowed');
 ok(limits.combatApproved,'Package 02 remains explicitly approved without a fixed cap');
 for(let i=0;i<limits.blockedPackages.length;i++)ok(limits.blockedPackages[i],'Package '+['04','05','90'][i]+' remains blocked despite consistent source metadata');
 ok(limits.wrongSourceBlocked,'Mixed source_package data is blocked');
 const held=await page.evaluate(reviewPath=>{const a={...packageAnalysis,items:packageAnalysis.items.map(i=>i.source_path===reviewPath?{...i,review:false,include:true,asset_type:'weapon',category:'weapons'}:i)};return ASSET_LIBRARY_IMPORT.buildBatchPlan(a,[],4)},reviewPath);
 ok(held.remaining===4&&held.review_excluded===2,'Original Review CSV cannot enter production through local retyping');
 // Create a truthful complete SHA in the isolated live store, from the already approved package 01.
 await page.evaluate(async({b64,sha,cosmetic,world})=>{await JMA_ASSET_STORE.load({strict:true});await JMA_ASSET_STORE.save({id:'known-from-cosmetic',name:'Existing fixture image',asset_type:'image',category:'profile',status:world?'active':'draft',file_ref:null,catalog_id:null,sort_order:0,metadata:{source_package:cosmetic,source_path:'Profile/known.png',sha256:sha}},null,new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'known.png',{type:''}))},{b64:b64s[3],sha:sha[3],cosmetic,world});
 const knownBefore=(await db.query("select * from asset_library where id='known-from-cosmetic'")).rows[0];
 const resumed=await page.evaluate(resumePath=>ASSET_LIBRARY_IMPORT.candidate(packageAnalysis.items.find(i=>i.source_path===resumePath)),resumePath);
 await db.query('insert into asset_library(id,name,asset_type,category,status,metadata) values($1,$2,$3,$4,$5,$6)',[resumed.id,resumed.name,resumed.asset_type,resumed.category,'draft',resumed.metadata]);
 const preflight=await page.evaluate(async()=>{window.packageProof=await JMA_ASSET_STORE.batchPreflight();window.packageBatch=ASSET_LIBRARY_IMPORT.createProductionBatch(packageAnalysis,packageProof);return packageBatch.plan});
 ok(preflight.remaining===3&&preflight.new_candidates===2&&preflight.already_present===1&&preflight.resumable_drafts===1&&preflight.dry_run_limit===4,'Fresh isolated inventory reduces four candidates to three: two new, one resumed, one known SHA');
 const growth=await page.evaluate(async()=>{
  const a={...packageAnalysis,items:packageAnalysis.items.map(i=>({...i}))},b=ASSET_LIBRARY_IMPORT.createProductionBatch(a,packageProof);
  const extra=a.items.find(i=>i.source_path.endsWith('/mystery.png'));Object.assign(extra,{review:false,include:true,asset_type:'weapon',category:'weapons'});
  try{await b.run('IMPORT '+b.plan.remaining+' DRAFT-ASSETS');return false}catch(e){return e.message.includes('gewachsen')}
 });
 ok(growth,'An increased remaining amount between preflight and confirmed start blocks before workers launch');
 for(const width of [1920,390]){
  const ui=await pageFor('owner',width);ui.on('pageerror',e=>errors.push(e.message));await ui.locator('[data-asset-import-open]').click();await ui.locator('[data-batch-package]').fill(pkg);
  await ui.locator('[data-batch-files]').setInputFiles({name:'package-fixture.zip',mimeType:'application/zip',buffer:zip});await ui.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
  await ui.locator('[data-batch-production="preflight"]').click();await ui.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
  ok(await ui.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await ui.locator('.asset-batch-footer').innerText().then(t=>t.includes(caption)&&t.includes('Lokaler Dry Run:')),'Package '+num+' native preflight UI fits '+width+'px with package-specific Dry Run information');
  ok(await ui.locator('[data-batch-production="start"]').isDisabled()&&await ui.locator('.asset-batch-footer button').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=44)),width+'px package '+num+' start remains locked without confirmation and controls retain 44px height');
  await ui.locator('[data-batch-production-confirm]').fill('IMPORT 4 DRAFT-ASSETS');ok(await ui.locator('[data-batch-production="start"]').isDisabled(),width+'px wrong package-preflight quantity remains blocked');
  await ui.locator('[data-batch-production-confirm]').fill('IMPORT 3 DRAFT-ASSETS');ok(!await ui.locator('[data-batch-production="start"]').isDisabled(),width+'px exact package-preflight quantity enables the existing start control');
  await ui.locator('.asset-batch-footer').scrollIntoViewIfNeeded();await ui.screenshot({path:path.join(out,'batch-package-'+num+'-'+width+'.png'),fullPage:width===390});
 }
 const uploadStart=metrics().uploads,report=await page.evaluate(async()=>{await packageBatch.run('IMPORT '+packageBatch.plan.remaining+' DRAFT-ASSETS');return packageBatch.report()});
 ok(report.new_imported===2&&report.resumed_drafts===1&&report.already_fully_present===1&&report.verified_assets===3&&report.source_package===pkg,'Existing shared controller imports/resumes the isolated package '+num+' set and verifies it');
 ok(report.new_active_assets===0&&report.review_untouched===2&&report.storage_attachment_open.length===0&&metrics().uploads===uploadStart+3,'No Review or redundant uploads, no active releases, no open attachments');
 const rows=(await db.query("select * from asset_library where metadata->>'source_package'=$1",[pkg])).rows;
 ok(rows.length===3&&rows.some(r=>r.id===resumed.id&&r.revision===3)&&rows.every(r=>r.status==='draft'&&!r.users_available),'Resume preserves ID/revision without a duplicate row; all resulting assets stay draft');
 for(const row of rows){const original=png[sha.indexOf(row.metadata.sha256)],stored=objectBytes.get('archive-assets/'+row.storage_path);ok(stored.equals(original)&&crypto.createHash('sha256').update(stored).digest('hex')===row.metadata.upload.sha256&&row.metadata.upload.mime==='image/png','Package '+num+' normalized PNG preserves original bytes/SHA and verified MIME: '+row.metadata.original_name)}
 if(world)assert.equal(knownBefore.status,'active');
 ok(JSON.stringify((await db.query("select * from asset_library where id='known-from-cosmetic'")).rows[0])===JSON.stringify(knownBefore),'Previously complete asset (active in World fixture) remains byte-equivalent and is never changed');
 ok(errors.length===0,'No Chromium exceptions: '+errors.join('; '));
 fs.writeFileSync(path.join(out,'batch-package-'+num+'-fixture-report.json'),JSON.stringify({local_dry_run:dry.report,preflight:{local_unique_limit:preflight.dry_run_limit,new:preflight.new_candidates,resume:preflight.resumable_drafts,known:preflight.already_present},isolated_execution:report,production_writes:0},null,2));
 console.log(JSON.stringify({checks,isolated_fixtures:true,production_writes:0}));
};
