// Run through the existing auth/PostgreSQL/browser harness with --batch-import.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {zipSync}=require('../vendor/fflate-0.8.2.min.js');
module.exports=async({db,pageFor,metrics,out})=>{
 let checks=0;const ok=(condition,label)=>{assert.ok(condition,label);console.log('PASS BATCH',++checks,label)};
 const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const snapshots=async()=>JSON.stringify((await db.query('select * from asset_library order by id')).rows);
 const before=await snapshots();let clientWrites=0;
 page.on('request',req=>{if(req.url().endsWith('/test-db')){const body=req.postDataJSON();if(body.action!=='select')clientWrites++}if(req.url().includes('/test-storage/upload'))clientWrites++});
 const colors=await page.evaluate(()=>['#c41a40','#2b9baf','#78bb22','#6629c1','#cc8711','#11ba54'].map(color=>{const c=document.createElement('canvas');c.width=24;c.height=20;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,24,20);return c.toDataURL('image/png').split(',')[1]}));
 const png=colors.map(b=>Buffer.from(b,'base64')),sha=png.map(b=>crypto.createHash('sha256').update(b).digest('hex'));
 const pkg='OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip';
 const make=(entries,level=6)=>Buffer.from(zipSync(Object.fromEntries(Object.entries(entries).map(([k,v])=>[k,new Uint8Array(v)])),{level}));
 const fixtures={
  'part-1.zip':make({'Avatars/folder.png':png[0],'Frames/same.png':png[1],'Mystery/same.png':png[2],'Mystery/known.png':png[3],'Mystery/manifest.png':png[4],'Mystery/avatar_rule.png':png[5],'Unknown/opaque.png':png[2],'bad.png':Buffer.from('not an image'),'script.js':Buffer.from('throw Error("NEVER RUN")'),'../escape.png':png[0],'/absolute.png':png[0],'__MACOSX/ghost.png':png[0],'folder\\escape.png':png[0]}),
  'part-2.zip':make({'Duplicates/copy.png':png[0],'Banners/b.png':png[5],'Mystery/item_rule.png':png[4],'Unknown/opaque.png':png[2]}),
  'OnceHuman_CMS_v2_Manifest.csv':Buffer.from('\ufeffsource_path;original_name;asset_type;category;sha256;source_package;display_name\r\nMystery/manifest.png;manifest.png;frame;profile;'+sha[4]+';'+pkg+';"Prepared; Frame"\r\nUnknown/opaque.png;opaque.png;avatar;not-a-known-category;'+sha[2]+';'+pkg+';Unknown\r\n'),
  'OnceHuman_CMS_v2_Review_Queue.csv':Buffer.from('relative_path,original_filename,asset_type,category,hash,review_status\nMystery/same.png,same.png,banner,profile,'+sha[2]+',ZUORDNUNG PRÜFEN\n')
 };
 const payload=(name,bytes=fixtures[name])=>({name,mimeType:name.endsWith('.zip')?'application/zip':'text/csv',buffer:bytes});
 const known=[{id:'known-image',name:'known',asset_type:'banner',category:'profile',file_ref:'assets/branding/once-human-logo.png',persisted:true,metadata:{sha256:sha[3],source_package:pkg,source_path:'Mystery/known.png'}}];
 async function engine(names,more={}){
  return page.evaluate(async({inputs,pkg,known,more})=>{
   const files=inputs.map(({name,b64})=>new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name));
   window.batchEngine=await ASSET_LIBRARY_IMPORT.analyze({files,known,sourcePackage:pkg,previous:more.previous?window.batchEngine:null});
   return {report:ASSET_LIBRARY_IMPORT.report(window.batchEngine),items:window.batchEngine.items.map(({read,...i})=>i)};
  },{inputs:names.map(n=>({name:n,b64:fixtures[n].toString('base64')})),pkg,known,more});
 }
 let data=await engine(['part-1.zip']);const find=(d,p)=>d.items.find(i=>i.source_path===p);
 ok(data.report.total_files===13&&data.report.valid_images===7&&data.report.invalid_files===6,'ZIP directory and excluded/non-image files counted truthfully');
 ok(find(data,'Avatars/folder.png').classification_source==='folder'&&find(data,'Avatars/folder.png').asset_type==='avatar','Unambiguous folder classification');
 ok(find(data,'Mystery/avatar_rule.png').classification_source==='filename_rule','Explicit filename rule, no visual inference');
 ok(find(data,'Mystery/known.png').already_imported&&find(data,'Mystery/known.png').classification_source==='duplicate_hash','Existing SHA and exact package/path prove reimport');
 ok(find(data,'Frames/same.png').name_duplicate&&find(data,'Mystery/same.png').name_duplicate&&find(data,'Frames/same.png').sha256!==find(data,'Mystery/same.png').sha256,'Same names distinguished from exact bytes');
 ok(data.items.filter(i=>i.valid).every(i=>i.status==='draft'),'Every candidate remains draft');
 ok(data.items.filter(i=>!i.valid&&/Pfad|System/.test(i.error)).length===4,'Traversal, absolute paths, backslash and system files excluded');
 data=await engine(['OnceHuman_CMS_v2_Manifest.csv','OnceHuman_CMS_v2_Review_Queue.csv'],{previous:true});
 ok(find(data,'Mystery/manifest.png').classification_source==='manifest'&&find(data,'Mystery/manifest.png').asset_type==='frame'&&find(data,'Mystery/manifest.png').name==='Prepared; Frame','Separately loaded BOM/semicolon/quoted manifest applies to previous ZIP');
 ok(find(data,'Unknown/opaque.png').review&&find(data,'Mystery/same.png').review,'Unknown category and explicit Review CSV stay in Review');
 data=await engine(['part-2.zip'],{previous:true});
 ok(data.report.total_files===18&&data.report.repeated_entries_not_counted===1,'Parts merge into logical files; repeated path plus hash counted once');
 ok(find(data,'Duplicates/copy.png').classification_source==='duplicate_hash'&&find(data,'Duplicates/copy.png').asset_type==='avatar','SHA classification crosses ZIP parts');
 ok(find(data,'Mystery/item_rule.png').classification_source==='duplicate_hash'&&find(data,'Mystery/item_rule.png').asset_type==='frame','Higher manifest classification of same SHA beats lower filename rule');
 fs.writeFileSync(path.join(out,'batch-classification-fixture.json'),JSON.stringify(data,null,2));
 const beforeRepeat=data.report.total_files;data=await engine(['part-1.zip','OnceHuman_CMS_v2_Manifest.csv'],{previous:true});
 ok(data.report.total_files===beforeRepeat&&data.report.metadata_files===2,'Repeated whole ZIP and CSV do not duplicate statistics');
 ok(new Set(data.items.map(i=>i.id)).size===data.items.length&&data.items.every(i=>i.source_package===pkg),'Collision-safe distinct IDs and one source_package');
 ok(await page.evaluate(()=>{const i=batchEngine.items.find(i=>!i.review&&i.valid);const c=ASSET_LIBRARY_IMPORT.candidate(i);return c.status==='draft'&&c.file_ref===null&&c.metadata.sha256===i.sha256&&c.metadata.source_path===i.source_path}), 'Existing model validation prepares flat metadata and no storage pointer');
 // A different file at the same path is retained, marked Review, never overwritten.
 fixtures['conflict.zip']=make({'Avatars/folder.png':png[1]});data=await engine(['conflict.zip'],{previous:true});
 ok(data.items.filter(i=>i.source_path==='Avatars/folder.png').length===2&&data.items.filter(i=>i.source_path==='Avatars/folder.png').every(i=>i.path_duplicate&&!i.include&&!i.review),'Path conflict across parts remains two distinct candidates without polluting classification Review');
 fixtures['broken.zip']=Buffer.from('invalid zip');
 ok(await page.evaluate(async b64=>{try{await ASSET_LIBRARY_IMPORT.analyze({files:[new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'broken.zip')],sourcePackage:'p'});return false}catch{return true}},fixtures['broken.zip'].toString('base64')),'Invalid ZIP rejected');
 // Corrupt stored member; central CRC remains the original.
 const damaged=Buffer.from(make({'Avatars/crc.png':png[0]},0));damaged[30+Buffer.byteLength('Avatars/crc.png')+10]^=1;fixtures['crc.zip']=damaged;
 const bad=await engine(['crc.zip']);ok(bad.report.invalid_files===1&&bad.items[0].error.includes('Prüfsumme'),'ZIP member CRC corruption rejected before image classification');
 ok(await page.evaluate(()=>{const rows=ASSET_LIBRARY_IMPORT.parseCSV('path,name\n"a\npath","Quote ""Name"""\n');return rows[0].path==='a\npath'&&rows[0].name==='Quote "Name"'}),'CSV multiline and escaped quotes');
 ok(await page.evaluate(()=>{try{ASSET_LIBRARY_IMPORT.parseCSV('path,name\n"open');return false}catch{return true}}),'Malformed CSV rejected');
 const extra=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=23;canvas.height=19;canvas.getContext('2d').fillRect(0,0,23,19);
  const files=await Promise.all(['image/jpeg','image/webp'].map(async(type)=>new File([await new Promise(r=>canvas.toBlob(r,type))],type==='image/jpeg'?'avatar-original.jpeg':'banner-original.webp',{type})));
  const result=await ASSET_LIBRARY_IMPORT.analyze({files,sourcePackage:'extra'});
  return {report:ASSET_LIBRARY_IMPORT.report(result),same:await Promise.all(result.items.map(async(i,index)=>i.sha256===Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await files[index].arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')))};
 });
 ok(extra.report.formats.jpg===1&&extra.report.formats.webp===1&&extra.same.every(Boolean),'JPEG and WebP pass shared validation with SHA matching unchanged original bytes');
 ok(await page.evaluate(async b64=>{const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'folder.png');Object.defineProperty(file,'webkitRelativePath',{value:'Avatars/folder.png'});const r=await ASSET_LIBRARY_IMPORT.analyze({files:[file],sourcePackage:'folder-batch'});return r.items[0].source_path==='Avatars/folder.png'&&r.items[0].asset_type==='avatar'},colors[0]),'Folder input retains webkitRelativePath and shares classification pipeline');
 const short=Buffer.from(make({'Avatars/short.png':png[0]}));const central=short.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));short.writeUInt32LE(1,central+24);fixtures['short.zip']=short;
 const overflow=await engine(['short.zip']);ok(overflow.report.invalid_files===1&&overflow.items[0].error.includes('Größe'),'Inflate worker rejects output beyond a forged small declared size');
 const encrypted=Buffer.from(make({'Avatars/encrypted.png':png[0]}));const encCentral=encrypted.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));encrypted.writeUInt16LE(encrypted.readUInt16LE(encCentral+8)|1,encCentral+8);fixtures['encrypted.zip']=encrypted;
 ok((await engine(['encrypted.zip'])).items[0].error.includes('Verschlüsselte'),'Encrypted member is explicitly excluded');
 const legacy=Buffer.from(make({'Avatars/e.png':png[0]}));const legCentral=legacy.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));legacy.writeUInt16LE(legacy.readUInt16LE(6)&~2048,6);legacy.writeUInt16LE(legacy.readUInt16LE(legCentral+8)&~2048,legCentral+8);legacy[30+8]=0x82;legacy[legCentral+46+8]=0x82;fixtures['legacy.zip']=legacy;
 ok((await engine(['legacy.zip'])).items[0].source_path==='Avatars/é.png','Standard CP437 ZIP filenames are preserved');
 await engine(['OnceHuman_CMS_v2_Manifest.csv']);const csvFirst=await engine(['part-1.zip'],{previous:true});
 ok(find(csvFirst,'Mystery/manifest.png').classification_source==='manifest'&&!csvFirst.report.warnings.some(w=>w.includes('Metadaten ohne passende Datei')&&w.endsWith('Mystery/manifest.png')),'Manifest can precede ZIP; pending-file warning clears when file arrives');
 const badMetadata=Buffer.from('source_path,asset_type,category\n"unfinished');fixtures['OnceHuman_CMS_v2_Review_Queue.csv']=badMetadata;const badCSV=await engine(['OnceHuman_CMS_v2_Review_Queue.csv']);
 ok(badCSV.report.total_files===1&&badCSV.report.invalid_metadata_files===1&&badCSV.report.invalid_files===1,'Malformed standalone CSV counted once and never partly applied');
 fixtures['OnceHuman_CMS_v2_Review_Queue.csv']=Buffer.from('relative_path,original_filename,asset_type,category,hash,review_status\nMystery/same.png,same.png,banner,profile,'+sha[2]+',ZUORDNUNG PRÜFEN\n');
 fixtures['compound.zip']=make({'01_Profile_Avatars/a.png':png[0],'Avatar_Frames/b.png':png[1]});
 const compound=await engine(['compound.zip']);ok(compound.items[0].asset_type==='avatar'&&compound.items[1].asset_type==='frame'&&compound.report.review===0,'Numbered/compound folders classify exact type words and specific avatar-frame phrase');
 fixtures['purpose.zip']=make({'Images/image1.png':png[0],'Frames/Images/plain.png':png[1],'Unknown/Avatar_Frame2.png':png[2],'Website/Images/site.png':png[3]});
 const purpose=await engine(['purpose.zip']);ok(find(purpose,'Images/image1.png').review&&find(purpose,'Frames/Images/plain.png').asset_type==='frame'&&find(purpose,'Unknown/Avatar_Frame2.png').asset_type==='frame'&&find(purpose,'Website/Images/site.png').asset_type==='image','Generic image containers do not invent a purpose; explicit frames/website and numbered phrases classify reliably');
 fixtures['review-flags.zip']=make({'Frames/hold.png':png[0],'Frames/accepted.png':png[1],'Frames/partial.png':png[2],'OnceHuman_CMS_v2_Manifest.csv':Buffer.from('source_path,asset_type,category,needs_review,review_status\nFrames/hold.png,frame,profile,true,\nFrames/accepted.png,frame,profile,false,reviewed\nFrames/partial.png,,profile,false,\n')});
 const flagResult=await engine(['review-flags.zip']);ok(find(flagResult,'Frames/hold.png').review&&!find(flagResult,'Frames/accepted.png').review&&find(flagResult,'Frames/partial.png').asset_type==='frame'&&!find(flagResult,'Frames/partial.png').review,'Boolean Review flags are honored, reviewed records retained, partial metadata completed without overriding fields');
 // Representative selection uses actual hashes, classifications and existing model metadata limits.
 fixtures['representatives.zip']=make({'Avatars/a-folder.png':png[0],'Avatars/z-manifest.png':png[0],'Banners/known-a.png':png[3],'Frames/known-z.png':png[3],'Opaque/review-a.png':png[2],'Opaque/review-z.png':png[2],'Opaque/mixed-review.png':png[4],'Frames/mixed-clear.png':png[4],'OnceHuman_CMS_v2_Manifest.csv':Buffer.from('source_path,asset_type,category,review,original_category_v2\nAvatars/z-manifest.png,avatar,profile,0,Profile/Avatars\nOpaque/review-a.png,,,1,Shop/Passes\nOpaque/review-z.png,,,1,Shop/Passes\nOpaque/mixed-review.png,,,1,Shop/Packs_Gifts\nFrames/mixed-clear.png,frame,profile,0,Profile/Frames\n')});
 let representatives=await engine(['representatives.zip']);
 ok(representatives.items.filter(i=>i.include).length===2,'Only one new representative for each clear SHA group; known and all-review groups excluded');
 ok(find(representatives,'Avatars/z-manifest.png').include&&!find(representatives,'Avatars/a-folder.png').include,'Manifest representative wins over an earlier folder-classified path');
 ok(representatives.items.filter(i=>i.sha256===sha[3]).every(i=>!i.include&&i.duplicate_state==='existing'),'Known SHA covers the entire group regardless of differing proposed uses');
 ok(representatives.items.filter(i=>i.sha256===sha[2]).every(i=>i.review&&!i.include&&i.duplicate_state==='review'),'All-review group has no automatic representative');
 ok(find(representatives,'Frames/mixed-clear.png').include&&find(representatives,'Opaque/mixed-review.png').review&&find(representatives,'Opaque/mixed-review.png').duplicate_state==='covered','A clear representative covers bytes without falsely finalizing a Review member');
 ok(await page.evaluate(()=>{const i=batchEngine.items.find(i=>i.source_path==='Frames/mixed-clear.png');const c=ASSET_LIBRARY_IMPORT.candidate(i);return c.metadata.duplicate_sources.length===2&&c.metadata.duplicate_sources.some(s=>s.source_path==='Opaque/mixed-review.png'&&s.original_name==='mixed-review.png'&&s.original_category==='Shop/Packs_Gifts')&&c.status==='draft'&&c.storage_path===null}), 'Representative metadata preserves all source paths, original names and prepared categories with no storage pointer');
 ok(representatives.report.exact_duplicate_groups===4&&representatives.report.duplicate_groups_with_new_representative===2&&representatives.report.duplicate_groups_already_present===1&&representatives.report.duplicate_groups_review===1&&representatives.report.duplicate_groups_without_representative.length===0,'Report partitions all SHA groups into new, existing, review or documented exclusion');
 ok(representatives.report.skipped_redundant_copies===4&&representatives.report.selected_unique_image_contents===2,'Report distinguishes redundant skipped copies from selected unique image bytes');
 const groupPaths=representatives.items.filter(i=>i.include).map(i=>i.source_path).sort();
 const reversed=await engine(['representatives.zip']);ok(JSON.stringify(reversed.items.filter(i=>i.include).map(i=>i.source_path).sort())===JSON.stringify(groupPaths),'Fresh random IDs do not affect representative paths');
 fixtures['tie-a.zip']=make({'Avatars/z.png':png[0]});fixtures['tie-b.zip']=make({'Avatars/a.png':png[0]});
 let tie=await engine(['tie-a.zip']);const zId=tie.items[0].id;tie=await engine(['tie-b.zip'],{previous:true});
 ok(find(tie,'Avatars/a.png').include&&!find(tie,'Avatars/z.png').include&&find(tie,'Avatars/z.png').id===zId,'Adding a lexically earlier part chooses deterministic path without changing existing IDs');
 const reverseTie=await engine(['tie-b.zip','tie-a.zip']);ok(reverseTie.items.find(i=>i.include).source_path==='Avatars/a.png','Reversed part order selects the same path');
 // Include/skip decisions are stored locally and applied by the same grouping policy on reanalysis.
 await page.evaluate(()=>{const i=batchEngine.items.find(i=>i.source_path==='Avatars/z.png');i.includeOverride=true});
 tie=await engine(['tie-a.zip'],{previous:true});ok(find(tie,'Avatars/z.png').include&&!find(tie,'Avatars/a.png').include&&tie.report.duplicate_groups_multiple_selected===0,'An explicit nondefault representative suppresses automatic inclusion of another copy');
 await page.evaluate(()=>{batchEngine.items.find(i=>i.source_path==='Avatars/z.png').includeOverride=false});
 tie=await engine(['tie-b.zip'],{previous:true});ok(find(tie,'Avatars/a.png').include,'Skipping a representative falls back to the next eligible unskipped source');
 await page.evaluate(()=>{for(const i of batchEngine.items)i.includeOverride=false});
 tie=await engine(['tie-a.zip'],{previous:true});ok(tie.report.selected_candidates===0&&tie.report.duplicate_groups_without_representative.length===1&&tie.report.duplicate_groups_without_representative[0].reason.includes('manuell'),'Skipping the entire clear group remains excluded with an auditable reason');
 await page.evaluate(()=>{for(const i of batchEngine.items)i.includeOverride=true});
 tie=await engine(['tie-a.zip'],{previous:true});ok(tie.report.selected_candidates===2&&tie.report.selected_unique_image_contents===1&&tie.report.duplicate_groups_multiple_selected===1,'Explicit multiple inclusion is preserved but unique content and manual duplication are counted separately');
 // Model limits remain authoritative; provenance is never silently truncated.
 fixtures['oversize-sources.zip']=make(Object.fromEntries(Array.from({length:500},(_,i)=>['Avatars/'+String(i).padStart(3,'0')+'-'+('x'.repeat(90))+'.png',png[0]])));
 const oversized=await engine(['oversize-sources.zip']);ok(oversized.report.selected_candidates===0&&oversized.report.duplicate_groups_without_representative.length===1&&oversized.items.some(i=>i.candidate_error.includes('32 KB'))&&oversized.items[0].duplicate_sources.length===500,'Oversized provenance retains every source and documents the existing metadata limit instead of losing sources or crashing');
 // UI workflow uses the existing library and preview.
 await page.locator('[data-asset-import-open]').click();ok(await page.locator('[data-asset-import]').count()===1&&await page.locator('[data-asset-save]').count()===0,'Importer is the local mode of existing library, without save control');
 async function add(p,name){await p.locator('[data-batch-files]').setInputFiles(payload(name));await p.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'))}
 await add(page,'part-1.zip');await add(page,'OnceHuman_CMS_v2_Manifest.csv');await add(page,'part-2.zip');
 ok(await page.locator('[data-batch-package]').inputValue()===pkg&&await page.locator('[data-batch-package]').getAttribute('readonly')!==null,'Shared package name stable after adding parts');
 await add(page,'part-1.zip');
 ok((await page.locator('.asset-batch-summary').innerText()).includes('Erneut gelesen / nicht doppelt gezählt'),'Repeated part explicitly documented');
 await page.locator('[data-batch-search]').fill('Prepared');ok(await page.locator('.asset-batch-row').count()===1,'Search by prepared display name');
 await page.locator('[data-batch-search]').fill('');await page.locator('[data-batch-filter="type"]').selectOption('frame');ok(await page.locator('.asset-batch-row').count()>=2,'Type filter');
 await page.locator('[data-batch-filter="type"]').selectOption('');await page.locator('[data-batch-filter="duplicate"]').selectOption('representative');
 ok(await page.locator('.asset-batch-row').count()===3&&(await page.locator('.asset-batch-list').innerText()).includes('REPRÄSENTANT'),'UI exposes only the three new group representatives');
 await page.locator('[data-batch-search]').fill('Prepared');await page.locator('[data-batch-check]').check();await page.locator('[data-batch-action="skip"]').click();
 ok(await page.locator('.asset-batch-row').count()===0,'Skipping a representative recalculates group role immediately in the UI');
 await page.locator('[data-batch-search]').fill('');ok(await page.locator('.asset-batch-row').count()===3&&(await page.locator('.asset-batch-list').innerText()).includes('item_rule.png'),'The next clear source takes over without losing the SHA group');
 await page.locator('[data-batch-select="none"]').click();await page.locator('[data-batch-filter="duplicate"]').selectOption('covered');
 ok((await page.locator('.asset-batch-list').innerText()).includes('DUPLIKAT – DURCH REPRÄSENTANT ABGEDECKT'),'Covered duplicate status is separately filterable and names its representative');
 await page.locator('[data-batch-search]').fill('Prepared');await page.locator('[data-batch-check]').check();await page.locator('[data-batch-action="include"]').click();
 await page.locator('[data-batch-filter="duplicate"]').selectOption('representative');ok((await page.locator('.asset-batch-list').innerText()).includes('MANUELL VORGEMERKT'),'Explicit manual representative takeover preserves the local override');
 await page.locator('[data-batch-select="none"]').click();await page.locator('[data-batch-search]').fill('');await page.locator('[data-batch-filter="duplicate"]').selectOption('existing');
 ok(await page.locator('.asset-batch-row').count()===0,'Existing-image filter does not falsely treat unhashed legacy inventory or name collisions as proof');
 await page.locator('[data-batch-filter="duplicate"]').selectOption('review');ok((await page.locator('.asset-batch-list').innerText()).includes('DUPLIKATGRUPPE IN REVIEW'),'All-unresolved group state is visible in the duplicate filter');
 await page.locator('[data-batch-filter="duplicate"]').selectOption('');
 await page.locator('[data-batch-filter="type"]').selectOption('');await page.locator('[data-batch-view="review"]').click();
 ok(await page.locator('.asset-batch-row').count()>0&&!(await page.locator('.asset-batch-list').innerText()).includes('AUSGESCHLOSSEN'),'Review Queue excludes unsupported/invalid files');
 await page.locator('[data-batch-select="review"]').click();await page.locator('[data-batch-bulk-type]').selectOption('avatar');await page.locator('[data-batch-bulk-category]').fill('profile');await page.locator('[data-batch-action="classify"]').click();
 ok(await page.locator('.asset-batch-row').count()===0,'Bulk manual confirmation clears resolvable review candidates');
 await page.locator('[data-batch-view=""]').click();await page.locator('[data-batch-filter="source"]').selectOption('manual');
 ok(await page.locator('.asset-batch-row').count()>0,'Manual classification source visible and filterable');
 await page.locator('[data-batch-select="visible"]').click();await page.locator('[data-batch-action="include"]').click();ok((await page.locator('.asset-batch-list').innerText()).includes('VORGEMERKT · DRAFT'),'Bulk include remains draft');
 await page.locator('[data-batch-action="skip"]').click();ok(!(await page.locator('.asset-batch-list').innerText()).includes('VORGEMERKT'),'Bulk skip updates local candidates');
 const manualIDs=await page.locator('[data-batch-preview]').evaluateAll(buttons=>buttons.map(b=>b.dataset.batchPreview));await add(page,'part-2.zip');
 ok(JSON.stringify(await page.locator('[data-batch-preview]').evaluateAll(buttons=>buttons.map(b=>b.dataset.batchPreview)))===JSON.stringify(manualIDs)&&!(await page.locator('.asset-batch-list').innerText()).includes('VORGEMERKT'),'Later part addition preserves manually confirmed uses, stable IDs and skip decisions');
 await page.locator('[data-batch-filter="source"]').selectOption('');await page.locator('[data-batch-filter="type"]').selectOption('avatar');await page.locator('[data-batch-preview]').first().click();
 await page.waitForSelector('[data-batch-preview-body] .avatar-image[src^="blob:"]');
 ok(await page.locator('[data-batch-preview-body] .profile-avatar').count()===1&&await page.locator('[data-batch-preview-body] .avatar-frame').count()===1,'Batch reuses the combined real avatar/frame/banner preview');
 await page.locator('[data-batch-filter="type"]').selectOption('');await page.locator('[data-batch-filter="duplicate"]').selectOption('hash');ok((await page.locator('.asset-batch-list').innerText()).includes('BILDDUPLIKAT'),'Exact duplicate filter');
 await page.locator('[data-batch-filter="duplicate"]').selectOption('');await page.locator('[data-batch-filter="status"]').selectOption('draft');ok(!(await page.locator('.asset-batch-list').innerText()).includes('AUSGESCHLOSSEN'),'Draft filter excludes invalid files');
 await page.locator('[data-batch-filter="status"]').selectOption('');
 const state=await page.locator('.asset-batch-summary').innerText();await page.evaluate(()=>JMA_RENDER());ok(await page.locator('.asset-batch-summary').innerText()===state,'Ordinary app render preserves analysis and selection session');
 const downloadEvent=page.waitForEvent('download');await page.locator('[data-batch-action="export"]').click();const download=await downloadEvent,exportPath=await download.path(),json=JSON.parse(fs.readFileSync(exportPath,'utf8'));
 ok(json.report.production_writes===0&&json.items.filter(i=>i.candidate).every(i=>i.candidate.status==='draft'),'Export is a local auditable dry run with only draft candidates');
 fs.writeFileSync(path.join(out,'batch-fixture-dry-run.json'),JSON.stringify(json,null,2));
 await page.locator('[data-batch-action="close"]').click();ok(await page.locator('[data-asset-save]').count()===1&&await page.locator('[data-asset-import-open]').evaluate(el=>document.activeElement===el),'Closing restores the existing editor and keyboard focus');
 await page.locator('[data-asset-import-open]').click();ok(await page.locator('.asset-batch-summary').innerText()===state,'Reopening does not reanalyze or double count');
 await page.screenshot({path:path.join(out,'batch-desktop.png'),fullPage:true});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'1920px no horizontal overflow');
 // 1,620 entries; two local ZIP parts with one exact reload, never 1,620 DOM cards.
 const largeEntries=Object.fromEntries(Array.from({length:1620},(_,i)=>['Avatars/a-'+i+'.png',png[i%png.length]]));fixtures['large.zip']=make(largeEntries);
 await page.locator('[data-batch-action="clear"]').click();await add(page,'large.zip');
 ok(await page.locator('.asset-batch-row').count()===24,'1620 images render only one 24-row page');
 await page.locator('[data-batch-action="next"]').click();ok((await page.locator('.asset-batch-layout').innerText()).includes('Seite 2 / 68'),'Pagination advances without full list DOM');
 await page.locator('[data-batch-select="duplicates"]').click();ok((await page.locator('.asset-batch-bulk').innerText()).includes('1620 ausgewählt'),'Bulk duplicate selection operates on all filtered records, not only DOM rows');
 await page.locator('[data-batch-select="none"]').click();ok((await page.locator('.asset-batch-bulk').innerText()).includes('0 ausgewählt'),'Selection clear');
 await page.locator('[data-batch-files]').setInputFiles(payload('large.zip'));await page.locator('[data-batch-action="cancel"]').click();await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('abgebrochen'));
 ok((await page.locator('.asset-batch-summary').innerText()).includes('1620'),'Cancelled addition preserves previous complete result');
 await page.locator('[data-batch-files]').setInputFiles(payload('broken.zip'));await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('ZIP benötigt'));ok(await page.locator('.asset-batch-row').count()===24,'Invalid ZIP does not discard the prior session');
 const mobile=await pageFor('owner',390);mobile.on('pageerror',e=>errors.push(e.message));await mobile.locator('[data-asset-import-open]').click();await add(mobile,'part-1.zip');
 ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px import UI has no horizontal overflow');
 ok(await mobile.locator('.asset-batch button:visible').evaluateAll(buttons=>buttons.every(b=>b.getBoundingClientRect().height>=44)),'390px all visible controls retain 44px touch targets');
 await mobile.locator('[data-batch-check]').first().tap();ok((await mobile.locator('.asset-batch-bulk strong').innerText()).includes('1 ausgewählt'),'Native touch selects an import row');
 await mobile.locator('[data-batch-preview]').first().tap();await mobile.waitForSelector('[data-batch-preview-body] .avatar-image[src^="blob:"]');
 await mobile.locator('[data-batch-preview-panel]').scrollIntoViewIfNeeded();await mobile.screenshot({path:path.join(out,'batch-mobile-preview.png')});
 await mobile.screenshot({path:path.join(out,'batch-mobile.png'),fullPage:true});
 for(const role of ['moderator','admin']){const p=await pageFor(role);await p.locator('[data-asset-import-open]').click();ok(await p.locator('[data-asset-import]').count()===1,role+' uses existing role authorization')}
 const user=await pageFor('user');ok(await user.locator('[data-asset-import-open]').count()===0&&await user.evaluate(async()=>{try{await ASSET_LIBRARY_IMPORT.analyze({files:[],sourcePackage:'p'});return false}catch(e){return e.message.includes('Rolle')}}),'Normal user has no importer and direct analyzer is role-guarded');
 await page.evaluate(()=>location.hash='#/database');await page.waitForFunction(()=>!document.querySelector('[data-asset-import]'));await page.evaluate(()=>location.hash='#/admin');await page.waitForSelector('[data-asset-import-open]');await page.locator('[data-asset-import-open]').click();ok(await page.locator('.asset-batch-row').count()===0,'Route exit releases and resets the local session');
 ok(await snapshots()===before&&metrics().uploads===0&&clientWrites===0,'All batch interactions leave actual isolated DB byte-equivalent and perform zero API writes/uploads');
 ok(errors.length===0,'No browser exceptions: '+errors.join('; '));
 console.log(JSON.stringify({checks,fixture_only:true,pilot_dry_run:'separate actual three-part Cosmetic run; these are synthetic regression fixtures',production_writes:0}));
};
