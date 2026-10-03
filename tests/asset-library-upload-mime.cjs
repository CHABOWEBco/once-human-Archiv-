// Actual ZIP reader + shared upload core + real browser Supabase SDK serialization.
// Auth/SQL/Storage are isolated fixtures; the real SDK uses only an in-memory fetch.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {zipSync}=require('../vendor/fflate-0.8.2.min.js');
module.exports=async({db,pageFor,metrics,out,objectBytes})=>{
 let checks=0;const ok=(value,label)=>{assert.ok(value,label);console.log('PASS UPLOAD MIME',++checks,label)};
 const sdkPath=process.env.ASSET_TEST_SUPABASE_SDK;assert.ok(sdkPath&&fs.existsSync(sdkPath),'ASSET_TEST_SUPABASE_SDK must point to the browser SDK used by index.html');
 await db.query("insert into asset_library(id,name,asset_type,category,status,metadata) values('mime-private-proof','Private fixture','image','profile','archived','{}')");
 const page=await pageFor('owner'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pkg='OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip';
 const images=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=25;canvas.height=21;
  return Promise.all([['image/png','ZIP Original.PNG'],['image/jpeg','ZIP Original.jpeg'],['image/webp','ZIP Original.webp']].map(async([mime,name],i)=>{
   canvas.getContext('2d').fillStyle=['purple','green','orange'][i];canvas.getContext('2d').fillRect(0,0,25,21);
   const bytes=new Uint8Array(await (await new Promise(r=>canvas.toBlob(r,mime))).arrayBuffer());
   return {mime,name,b64:btoa(String.fromCharCode(...bytes))};
  }));
 });
 const zip=Buffer.from(zipSync(Object.fromEntries(images.map(i=>['Avatars/'+i.name,new Uint8Array(Buffer.from(i.b64,'base64'))]))));
 await page.evaluate(async({b64,pkg})=>{window.mimeZip=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'mime-fixture.zip');window.mimeAnalysis=await ASSET_LIBRARY_IMPORT.analyze({files:[mimeZip],sourcePackage:pkg,known:[]})},{b64:zip.toString('base64'),pkg});
 const originals=await page.evaluate(async()=>Promise.all(mimeAnalysis.items.map(async item=>{const file=await item.read();return {name:file.name,type:file.type,sha256:item.sha256,info:await ASSET_LIBRARY_MODEL.inspectUpload(file)}})));
 for(const image of images){const original=originals.find(i=>i.name===image.name);ok(original.type===''&&original.info.mime===image.mime,'ZIP '+image.mime+' has empty File.type; Magic Bytes and decode verify the real MIME');ok(original.sha256===crypto.createHash('sha256').update(Buffer.from(image.b64,'base64')).digest('hex'),'Original '+image.mime+' SHA matches unchanged ZIP bytes')}
 // Reproduce the two image-less failed drafts, including their already saved upload intent.
 const candidates=await page.evaluate(()=>mimeAnalysis.items.map(i=>ASSET_LIBRARY_IMPORT.candidate(i))),reserved=[];
 for(const candidate of candidates.filter(c=>/\.(png|jpeg)$/i.test(c.metadata.original_name))){
  const extension=/\.png$/i.test(candidate.metadata.original_name)?'png':'jpg';
  const metadata={...candidate.metadata,import_pending:{storage_path:'library/'+candidate.id+'/'+crypto.randomUUID()+'.'+extension,sha256:candidate.metadata.sha256}};
  await db.query('insert into asset_library(id,name,asset_type,category,status,metadata) values($1,$2,$3,$4,$5,$6)',[candidate.id,candidate.name,candidate.asset_type,candidate.category,'draft',metadata]);
  await db.query('update asset_library set revision=revision+1 where id=$1',[candidate.id]);reserved.push({id:candidate.id,revision:2});
 }
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));
 await page.locator('[data-asset-import-open]').click();await page.locator('[data-batch-files]').setInputFiles({name:'mime-fixture.zip',mimeType:'application/zip',buffer:zip});
 await page.waitForFunction(()=>document.querySelector('[data-batch-progress]')?.textContent.includes('Analyse abgeschlossen'));
 await page.locator('[data-batch-production="preflight"]').click();await page.waitForFunction(()=>document.querySelector('[data-batch-production-message]')?.textContent.includes('Live-Preflight erfolgreich'));
 ok(/Resumierbare Drafts\s+2/.test(await page.locator('.asset-batch-footer').innerText()),'Fresh native preflight recognizes both failed drafts after ZIP reselection');
 await page.locator('[data-batch-production-confirm]').fill('IMPORT 3 DRAFT-ASSETS');await page.locator('[data-batch-production="start"]').click();
 await page.waitForFunction(()=>document.querySelector('.asset-batch-footer[aria-busy="false"]')?.textContent.includes('ABGESCHLOSSEN'));
 const rows=(await db.query("select * from asset_library where metadata->>'source_package'=$1",[pkg])).rows;
 ok(rows.length===3&&reserved.every(r=>rows.some(x=>x.id===r.id&&x.revision===r.revision+1)),'Both drafts keep their IDs and loaded revisions; no duplicate asset rows');
 const passed=await page.evaluate(async()=>Promise.all(assetTestUploadFiles.map(async({file,options,objectPath,bucket})=>({name:file.name,type:file.type,options,objectPath,bucket,b64:btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())))}))));
 for(const image of images){
  const upload=passed.find(u=>u.name===image.name),bytes=Buffer.from(upload.b64,'base64'),row=rows.find(r=>r.metadata.original_name===image.name);
  ok(upload.type===image.mime&&upload.options.contentType===image.mime,'Storage SDK receives File.type and contentType = '+image.mime+' with original filename');
  ok(bytes.equals(Buffer.from(image.b64,'base64'))&&objectBytes.get('archive-assets/'+row.storage_path).equals(bytes),'Normalized and stored '+image.mime+' bytes are byte-for-byte identical');
  ok(crypto.createHash('sha256').update(bytes).digest('hex')===row.metadata.upload.sha256&&row.metadata.sha256===row.metadata.upload.sha256,'Normalized '+image.mime+' SHA remains identical in upload and source metadata');
 }
 ok(passed.every(u=>u.type!=='application/octet-stream')&&rows.every(r=>r.status==='draft'&&r.users_available===false),'No octet-stream upload and every asset remains non-released draft');
 // Single upload uses exactly the same MIME normalization, without any batch-only workaround.
 await page.evaluate(async image=>{const file=new File([Uint8Array.from(atob(image.b64),c=>c.charCodeAt(0))],image.name,{type:''});await JMA_ASSET_STORE.save({id:'mime-single-upload',name:'Single original',asset_type:'image',category:'profile',file_ref:null,catalog_id:null,status:'draft',sort_order:0,metadata:{}},null,file)},images[0]);
 ok(await page.evaluate(()=>assetTestUploadFiles.at(-1).file.type==='image/png'),'Single-upload core also passes Magic-Byte-verified File MIME to Storage');
 const before=Number((await db.query('select count(*) n from asset_library')).rows[0].n),uploadBefore=metrics().uploads;
 const rejected=await page.evaluate(async image=>{
  const bytes=Uint8Array.from(atob(image.b64),c=>c.charCodeAt(0)),base={id:'mime-rejected',name:'Invalid original',asset_type:'image',category:'profile',file_ref:null,catalog_id:null,status:'draft',sort_order:0,metadata:{}};
  const files=[new File([bytes],'wrong.jpeg',{type:''}),new File([bytes.slice(0,16)],'damaged.png',{type:''}),new File([bytes],'wrong.png',{type:'image/jpeg'})];
  return Promise.all(files.map(async file=>{try{await JMA_ASSET_STORE.save(base,null,file);return false}catch{return true}}));
 },images[0]);
 ok(rejected.every(Boolean)&&metrics().uploads===uploadBefore&&Number((await db.query('select count(*) n from asset_library')).rows[0].n)===before,'False extension, corrupted PNG and false declared MIME are blocked before reservation or upload');
 // Load the existing frontend dependency for an actual SDK multipart test, never a production client.
 await page.addScriptTag({path:sdkPath});
 const wire=await page.evaluate(async image=>{
  const requests=[],sdk=supabase.createClient('https://storage-fixture.invalid','fixture-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{
   const request=new Request(input,init);if(!request.url.startsWith('https://storage-fixture.invalid/storage/v1/object/'))throw Error('Unexpected fixture request');
   const form=await request.formData(),file=form.get(''),bytes=new Uint8Array(await file.arrayBuffer());
   requests.push({name:file.name,type:file.type,b64:btoa(String.fromCharCode(...bytes))});
   const allowed=['image/png','image/jpeg','image/webp'].includes(file.type);
   return new Response(JSON.stringify(allowed?{Key:'archive-assets/fixture'}:{statusCode:'415',error:'InvalidMimeType',message:'mime type application/octet-stream is not supported'}),{status:allowed?200:415,headers:{'Content-Type':'application/json'}});
  }}});
  const original=new File([Uint8Array.from(atob(image.b64),c=>c.charCodeAt(0))],image.name,{type:''});
  const negative=await sdk.storage.from('archive-assets').upload('negative-control.png',original,{contentType:'image/png',upsert:false});
  for(const {file,options} of assetTestUploadFiles.slice(0,3)){const {error}=await sdk.storage.from('archive-assets').upload(file.name,file,options);if(error)throw Error(error.message)}
  return {negative_error:negative.error?.message,requests};
 },images[0]);
 ok(wire.negative_error?.includes('application/octet-stream')&&wire.requests[0].type==='application/octet-stream','Real Supabase SDK reproduces rejected empty-MIME multipart even with correct contentType option');
 for(const image of images){const sent=wire.requests.slice(1).find(r=>r.name===image.name);ok(sent?.type===image.mime&&Buffer.from(sent.b64,'base64').equals(Buffer.from(image.b64,'base64')),'Real Supabase SDK multipart transmits verified '+image.mime+' and identical original bytes')}
 ok(errors.length===0,'No Chromium exceptions: '+errors.join('; '));
 fs.writeFileSync(path.join(out,'upload-mime-fixture-report.json'),JSON.stringify({checks,reserved_ids:reserved.map(r=>r.id),resumed_ids:rows.filter(r=>reserved.some(x=>x.id===r.id)).map(r=>r.id),assets:rows.length,new_active_assets:rows.filter(r=>r.status==='active').length,wire,production_writes:0,sdk_sha256:crypto.createHash('sha256').update(fs.readFileSync(sdkPath)).digest('hex')},null,2));
 console.log(JSON.stringify({checks,isolated_fixtures:true,actual_browser_sdk:true,production_writes:0}));
};
