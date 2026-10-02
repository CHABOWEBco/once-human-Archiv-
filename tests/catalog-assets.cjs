// Focused Phase 2A.1 integration. Run: node tests/asset-library.cjs --catalog-link
// Reuses the existing SQL/RLS, authenticated client and Storage transport fixtures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {setupStorage}=require('./asset-library-sql.cjs');
module.exports=async({db,pageFor,field,save,open,objectBytes,metrics,out})=>{
 let checks=0;const errors=[],ok=(value,label)=>{assert.ok(value,label);console.log('PASS CATALOG ASSETS',++checks,label)};
 const original=(await db.query('select id,entry,revision from catalog_entries order by id')).rows;
 const fuchs=original.find(row=>row.id==='cat-tier-fuchs').entry;
 // Exact requested ID exists only in this isolated fixture, copied from the real Fuchs text.
 const sample={...fuchs,id:'cat-fuchs',image:'assets/items/test-catalog-original.png'};
 await db.query('insert into catalog_entries(id,entry) values($1,$2)',[sample.id,sample]);
 await setupStorage(db);
 await db.query("insert into asset_library(id,name,asset_type,category,catalog_id,status) values('catalog:cat-fuchs','Fuchs','catalog','animals','cat-fuchs','draft')");
 const owner=await pageFor('owner'),user=await pageFor('user');for(const p of [owner,user])p.on('pageerror',e=>errors.push(e.message));
 const png=fs.readFileSync(path.join(__dirname,'../assets/branding/once-human-logo.png')); // Existing neutral test image, never a production fox image.
 const card=p=>p.locator('[data-entry="cat-fuchs"] .catalog-card-art');
 const image=p=>card(p).locator('img');
 async function database(p,id='cat-fuchs'){
  await p.evaluate(()=>location.hash='#/database');await p.waitForSelector('#catalogSearch');await p.locator('#catalogSearch').fill(id);
 }
 async function refresh(p){await p.evaluate(async()=>{await JMA_ASSET_STORE.load();JMA_RENDER()})}
 async function central(p,id='catalog:cat-fuchs'){
  await p.waitForFunction(id=>{const i=document.querySelector('[data-entry="cat-fuchs"] img[data-catalog-central]');return i?.dataset.catalogCentral===id&&i.complete&&i.naturalWidth>0},id);
 }
 async function legacy(p){await p.waitForFunction(()=>{const i=document.querySelector('[data-entry="cat-fuchs"] .catalog-card-art img');return i?.src.endsWith('/assets/items/test-catalog-original.png')&&!i.dataset.catalogCentral&&i.complete&&i.naturalWidth>0})}
 async function change(sql,values=[]){await db.query(sql,values);await refresh(user)}
 await database(user,'cat-tier-fuchs');
 ok(await user.locator('[data-entry="cat-tier-fuchs"] .catalog-glyph').count()===1,'Actual Fuchs ID preserved; missing old category file keeps original glyph fallback');
 await database(user);await legacy(user);ok(await user.locator('[data-entry="cat-fuchs"]').count()===1,'Existing real static entry.image works when central asset is draft');
 await change("update asset_library set file_ref='assets/branding/once-human-logo.png',status='active',revision=revision+1 where id='catalog:cat-fuchs'");await central(user);
 ok(await image(user).getAttribute('src').then(s=>s.endsWith('assets/branding/once-human-logo.png')),'Active central static original resolves through existing imageUrl');
 await owner.reload();await owner.waitForFunction(()=>document.querySelector('[data-asset-message]')?.textContent.includes('Supabase verbunden'));await open(owner,'catalog:cat-fuchs');
 await owner.locator('[data-asset-file]').setInputFiles({name:'existing-test-logo.png',mimeType:'image/png',buffer:png});await owner.waitForFunction(()=>document.querySelector('[data-asset-upload-message]')?.textContent.includes('noch nicht gespeichert'));await save(owner);
 let row=(await db.query("select * from asset_library where id='catalog:cat-fuchs'")).rows[0];const originalStoragePath=row.storage_path;
 const geometry=await user.evaluate(async()=>{await JMA_ASSET_STORE.load();JMA_RENDER();const r=document.querySelector('[data-entry="cat-fuchs"] .catalog-card-art').getBoundingClientRect();return {height:r.height,width:r.width}});await central(user);
 ok(await image(user).getAttribute('src').then(s=>s.includes('/test-signed/'))&&objectBytes.get('archive-assets/'+row.storage_path).equals(png),'Existing Asset Library upload → exact catalog_id → signed normal Fuchs card; original bytes preserved');
 ok(await card(user).boundingBox().then(b=>b.height===geometry.height&&b.width===geometry.width),'Asynchronous central card keeps original image-box dimensions');
 await user.locator('[data-entry="cat-fuchs"] [data-db-found]').click();await central(user);
 ok(await card(user).locator('code').innerText()==='cat-fuchs'&&await card(user).locator('.catalog-found-mark').count()===1,'Replacing art preserves index, collection badge and actions');
 await user.locator('[data-entry="cat-fuchs"] .catalog-actions [data-db-detail]').click();
 const detailBefore=await user.locator('#catalogDossier .catalog-detail-art').boundingBox();
 await user.waitForFunction(()=>document.querySelector('#catalogDossier img[data-catalog-central]')?.src.includes('/test-signed/'));
 ok(await user.locator('#catalogDetailTitle').innerText()==='Fuchs'&&await user.locator('#catalogDossier img[data-catalog-central]').getAttribute('data-catalog-central')==='catalog:cat-fuchs','Same resolver supplies Fuchs detail without resetting the permanent dossier');
 ok(await user.locator('#catalogDossier .catalog-detail-art').boundingBox().then(b=>b.height===detailBefore.height&&b.width===detailBefore.width),'Detail image-box remains stable during async delivery');

 const signingBefore=metrics().signings;await user.evaluate(()=>JMA_RENDER());await central(user);
 ok(metrics().signings===signingBefore,'Ordinary catalog renders reuse the existing Signed URL cache');
 const ownerDatabase=await pageFor('owner');ownerDatabase.on('pageerror',e=>errors.push(e.message));await database(ownerDatabase);
 for(const status of ['draft','inactive','archived']){
  await field(owner,'status').selectOption(status);await save(owner);await refresh(user);await legacy(user);await refresh(ownerDatabase);await legacy(ownerDatabase);
  ok(await ownerDatabase.evaluate(async()=>await JMA_ASSET_STORE.catalogImage(CATALOG_DATA.entries.find(e=>e.id==='cat-fuchs'))===null),status+' excluded from normal catalog even for owner; user retains only legacy fallback');
  row=(await db.query("select * from asset_library where id='catalog:cat-fuchs'")).rows[0];
  ok(await user.evaluate(async row=>!!(await supabase.createClient().storage.from(row.storage_bucket).createSignedUrl(row.storage_path,60)).error,row),'Real Storage RLS denies user signing of '+status);
 }
 await field(owner,'status').selectOption('active');await save(owner);await refresh(user);await central(user);
 await change("update asset_library set catalog_id='cat-aug',revision=revision+1 where id='catalog:cat-fuchs'");await legacy(user);
 ok(await user.evaluate(async()=>await JMA_ASSET_STORE.catalogImage(CATALOG_DATA.entries.find(e=>e.id==='cat-fuchs'))===null),'Matching asset ID alone cannot bypass a different catalog_id');
 await change("update asset_library set catalog_id='cat-fuchs',asset_type='avatar',revision=revision+1 where id='catalog:cat-fuchs'");await legacy(user);
 ok(await user.evaluate(async()=>await JMA_ASSET_STORE.catalogImage(CATALOG_DATA.entries.find(e=>e.id==='cat-fuchs'))===null),'Linked active profile avatar cannot become a catalog image');
 await change("update asset_library set asset_type='weapon',revision=revision+1 where id='catalog:cat-fuchs'");await legacy(user);
 ok(await user.evaluate(async()=>await JMA_ASSET_STORE.catalogImage(CATALOG_DATA.entries.find(e=>e.id==='cat-fuchs'))===null),'Weapon purpose cannot become an animal/catalog image');
 await change("update asset_library set asset_type='catalog',revision=revision+1 where id='catalog:cat-fuchs'");await central(user);
 const secondary=await owner.evaluate(async bytes=>{
  await JMA_ASSET_STORE.load();const file=new File([Uint8Array.from(atob(bytes),c=>c.charCodeAt(0))],'existing-test-logo.png',{type:'image/png'});
  return JMA_ASSET_STORE.save({id:'alternate-fuchs-storage',name:'Isolated alternative',asset_type:'catalog',category:'animals',catalog_id:'cat-fuchs',file_ref:null,status:'active',sort_order:-100000,metadata:{}},null,file)
 },png.toString('base64'));
 await refresh(user);await central(user);ok(await image(user).getAttribute('data-catalog-central')==='catalog:cat-fuchs','Canonical catalog:<ID> wins among active Storage assets despite lower alternative sort_order');
 await change("update asset_library set storage_bucket=null,storage_path=null,file_ref='assets/branding/once-human-logo.png',revision=revision+1 where id='catalog:cat-fuchs'");await central(user,secondary.id);
 ok(await image(user).getAttribute('data-catalog-central')===secondary.id,'Valid linked Storage preferred over central static image deterministically');
 await change("update asset_library set storage_bucket='archive-assets',storage_path=$1,file_ref=null,revision=revision+1 where id='catalog:cat-fuchs'",[originalStoragePath]);await central(user);
 objectBytes.set('archive-assets/'+originalStoragePath,Buffer.from('unreadable isolated fixture'));
 await change("update asset_library set revision=revision+1 where id='catalog:cat-fuchs'");await central(user,secondary.id);
 ok(await image(user).getAttribute('data-catalog-central')===secondary.id,'Unreadable Storage original falls through to the next valid linked asset');
 objectBytes.set('archive-assets/'+originalStoragePath,png);await change("update asset_library set revision=revision+1 where id='catalog:cat-fuchs'");await central(user);
 const firstUrl=await image(user).getAttribute('src');await user.reload();await user.waitForSelector('#catalogSearch');await user.locator('#catalogSearch').fill('cat-fuchs');await central(user);
 ok(await image(user).getAttribute('src')!==firstUrl,'Reload creates a fresh authorized Signed URL');
 ok((await db.query("select entry,revision from catalog_entries where id='cat-fuchs'")).rows[0].entry.image===sample.image,'Storage resolution never persists Signed URL into legacy catalog entry.image');
 await user.setViewportSize({width:390,height:844});await user.evaluate(()=>JMA_RENDER());await central(user);
 ok(await user.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px normal card has no horizontal overflow');
 await user.locator('[data-entry="cat-fuchs"] .catalog-actions [data-db-detail]').click();await user.waitForFunction(()=>document.querySelector('#catalogDossier img[data-catalog-central]')?.complete);
 ok(await user.locator('#catalogDossier').boundingBox().then(b=>b.x>=0&&b.x+b.width<=390)&&await user.locator('#catalogDossier .catalog-detail-art').boundingBox().then(b=>b.height===180),'390px signed detail fits responsive dossier image box');
 await user.screenshot({path:path.join(out,'catalog-storage-mobile-detail.png'),fullPage:true});
 await user.screenshot({path:path.join(out,'catalog-storage-mobile.png'),fullPage:true});
 // Delayed response must never put the previous card's image into the next search result.
 await user.route('**/test-storage/sign',async route=>{await new Promise(resolve=>setTimeout(resolve,150));await route.continue()});
 await db.query("update asset_library set revision=revision+1 where id='catalog:cat-fuchs'");await refresh(user);await user.locator('#catalogSearch').fill('cat-aug');await user.waitForTimeout(350);
 ok(await user.locator('[data-entry="cat-fuchs"]').count()===0&&await user.locator('[data-entry="cat-aug"] [data-catalog-central="catalog:cat-fuchs"]').count()===0,'Late asynchronous Fuchs response cannot populate another catalog_id after filter render');
 await user.unroute('**/test-storage/sign');
 await owner.locator('[data-admin-view="editor"]').click();await owner.locator('[data-admin-edit-item="cat-fuchs"]').click();
 await owner.waitForFunction(()=>document.querySelector('[data-editor-image]')?.textContent==='Asset-Bibliothek öffnen'&&!document.querySelector('[data-editor-image]').disabled);
 ok(await owner.locator('[data-editor-media-kind]').innerText().then(t=>t.includes('ZENTRALE ASSET-BIBLIOTHEK'))&&await owner.locator('.admin-visual-editor input[type="file"]').count()===0,'Existing content editor marks central management, with no second upload control');
 await owner.locator('[data-editor-input="status"]').fill('Isolated revision test');await owner.locator('[data-editor-save]').click();await owner.waitForFunction(()=>document.querySelector('[data-editor-status] p')?.textContent.includes('wurde in Supabase gespeichert'));
 const edited=(await db.query("select entry,revision from catalog_entries where id='cat-fuchs'")).rows[0];
 ok(edited.revision===2&&edited.entry.image===sample.image,'Existing catalog text/revision save works and retains legacy image fallback');
 const revision=(await db.query("select revision from asset_library where id='catalog:cat-fuchs'")).rows[0].revision;
 await owner.locator('[data-editor-image]').click();await owner.waitForFunction(()=>document.querySelector('[data-asset-field="id"]')?.value==='catalog:cat-fuchs'&&!document.querySelector('[data-asset-save]')?.disabled);
 ok(await owner.locator('.asset-note').allTextContents().then(texts=>texts.some(t=>t.includes('Revision '+revision))),'Central action selects the correct existing asset and reloads its latest persisted revision');
 await save(owner);ok((await db.query("select revision from asset_library where id='catalog:cat-fuchs'")).rows[0].revision===revision+1,'Forwarded Asset Library editor continues using existing revision-protected save');
 await owner.locator('[data-admin-view="editor"]').click();await owner.locator('[data-admin-edit-item="cat-tier-fuchs"]').click();await owner.waitForFunction(()=>document.querySelector('[data-editor-media-path]')?.textContent.includes('catalog:cat-tier-fuchs'));
 ok(await owner.locator('[data-editor-image]').innerText()==='Asset-Bibliothek öffnen','Actual live Fuchs ID uses its original canonical central relationship');
 await owner.setViewportSize({width:390,height:844});await owner.locator('[data-editor-image]').scrollIntoViewIfNeeded();
 ok(await owner.locator('[data-editor-image]').boundingBox().then(b=>b.x>=0&&b.x+b.width<=390&&b.height>=44)&&await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px central editor action fits and has a 44px touch target');
 await owner.screenshot({path:path.join(out,'catalog-storage-editor-mobile.png'),fullPage:true});
 await owner.setViewportSize({width:1920,height:1080});await owner.screenshot({path:path.join(out,'catalog-storage-editor-desktop.png'),fullPage:true});
 const preserved=(await db.query("select id,entry,revision from catalog_entries where id<>'cat-fuchs' order by id")).rows;
 ok(JSON.stringify(preserved)===JSON.stringify(original),'Original 21 catalog records/content/revisions preserved in focused integration');
 ok(errors.length===0,'No browser exceptions: '+errors.join('; '));
 console.log('PASS catalog-assets checks:',checks);
 await require('./database-admin.cjs')({db,pageFor,out,field,save,open});
};
