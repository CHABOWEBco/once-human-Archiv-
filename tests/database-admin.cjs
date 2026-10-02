// Direct database actions through the shared editor and existing PostgreSQL/RLS adapter.
// Invoked by tests/asset-library.cjs --catalog-link; all writes are isolated fixtures.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
module.exports=async({db,pageFor,out,field,save:saveAsset,open})=>{
 let checks=0;const errors=[],ok=(condition,label)=>{assert.ok(condition,label);console.log('PASS DATABASE ADMIN',++checks,label)};
 const database=async p=>{await p.evaluate(()=>location.hash='#/database');await p.waitForSelector('#catalogSearch')};
 const input=(p,key)=>p.locator('#catalogEditorDialog [data-editor-input="'+key+'"]');
 const close=async p=>{await p.locator('#catalogEditorDialog [data-editor-close]').first().click();await p.waitForSelector('#catalogEditorDialog',{state:'detached'})};
 const save=async p=>{await p.locator('#catalogEditorDialog [data-editor-save]').click();await p.waitForFunction(()=>document.querySelector('#catalogEditorDialog [data-editor-status] p')?.textContent.includes('wurde in Supabase gespeichert'))};
 const search=async(p,id)=>{await p.locator('#catalogSearch').fill(id)};
 const row=async id=>(await db.query('select * from catalog_entries where id=$1',[id])).rows[0];
 const foxId='cat-tier-fuchs',original=await row(foxId);
 const owner=await pageFor('owner');owner.on('pageerror',e=>errors.push(e.message));
 await open(owner,'catalog:cat-tier-fuchs');
 await owner.locator('[data-asset-file]').setInputFiles({name:'unchanged-original-fixture.png',mimeType:'image/png',buffer:fs.readFileSync(path.join(__dirname,'../assets/branding/once-human-logo.png'))});
 await owner.waitForFunction(()=>document.querySelector('[data-asset-upload-message]')?.textContent.includes('noch nicht gespeichert'));
 await field(owner,'status').selectOption('active');await saveAsset(owner);
 const assetBefore=(await db.query("select * from asset_library where id='catalog:cat-tier-fuchs'")).rows[0];
 const user=await pageFor('user');user.on('pageerror',e=>errors.push(e.message));await database(user);await search(user,foxId);
 await user.waitForFunction(()=>document.querySelector('#catalogDossier img[data-catalog-central]')?.complete);
 ok(await user.locator('[data-db-mode],[data-db-edit],[data-db-add],[data-db-archive],[data-db-asset]').count()===0,'Normal user has no database editing controls');
 ok(await user.locator('#catalogDossier img').getAttribute('data-catalog-central')==='catalog:cat-tier-fuchs','Actual Fuchs ID and private Storage image feed the permanent dossier');
 await user.evaluate(()=>ADMIN_PANEL.openCatalogEditor('cat-tier-fuchs'));
 ok(await user.locator('#catalogEditorDialog').count()===0,'Programmatic direct editor refuses the normal user');
 const denied=await user.evaluate(async()=>{const e=CATALOG_DATA.entries.find(e=>e.id==='cat-tier-fuchs');try{await JMA_CATALOG.update({...e,archived:true},JMA_CATALOG.revision(e.id));return false}catch(error){return error.message.includes('Rolle erforderlich')}});
 ok(denied,'Normal user cannot invoke the existing archive write');
 const raw=await user.evaluate(async()=>await supabase.createClient().from('catalog_entries').update({entry:{...CATALOG_DATA.entries.find(e=>e.id==='cat-tier-fuchs'),archived:true},revision:2}).eq('id','cat-tier-fuchs').select().maybeSingle());
 ok(!raw.data,'Existing PostgreSQL RLS rejects user writes independently of hidden buttons');
 for(const role of ['moderator','admin','owner']){
  const p=role==='owner'?owner:await pageFor(role);p.on('pageerror',e=>errors.push(e.message));await database(p);await p.evaluate(async()=>{await JMA_CATALOG.load();JMA_RENDER()});
  ok(await p.locator('[data-db-mode]').count()===1,role+' sees the role-gated edit mode');
  await p.locator('[data-db-mode]').click();await search(p,foxId);
  ok(await p.locator('.catalog-card [data-db-edit]').count()===1&&await p.locator('#catalogDossier [data-db-asset]').count()===1,role+' receives card and dossier actions in the same database');
  await p.locator('.catalog-card [data-db-edit]').click();
  ok(await input(p,'name').inputValue()==='Fuchs'&&await p.locator('#catalogEditorDialog input[type="file"]').count()===0,role+' opens the shared correct editor with no second upload');
  await input(p,'description').fill('Isolated direct edit · '+role);
  const old=await row(foxId);await save(p);
  ok((await row(foxId)).revision===old.revision+1&&(await row(foxId)).entry.description==='Isolated direct edit · '+role,role+' saves through existing catalog revision/RLS');
  await close(p);
  await p.locator('[data-db-mode]').click();
  ok(await p.locator('[data-db-edit],[data-db-archive],[data-db-add]').count()===0,role+' edit mode turns off cleanly');
 }
 await owner.locator('[data-db-mode]').click();await search(owner,foxId);await owner.locator('#catalogDossier [data-db-edit]').click();
 await input(owner,'description').fill('Stable unsaved modal draft');
 await owner.evaluate(()=>{window.testCatalogModal=document.querySelector('#catalogEditorDialog');JMA_RENDER()});
 ok(await owner.evaluate(()=>document.querySelector('#catalogEditorDialog')===window.testCatalogModal)&&await input(owner,'description').inputValue()==='Stable unsaved modal draft','Ordinary website rerender keeps the same modal and unsaved editor draft');
 await owner.keyboard.press('Escape');await owner.waitForSelector('#catalogEditorDialog',{state:'detached'});
 ok(await owner.locator('#catalogDossier').isVisible(),'Escape closes shared editor and leaves permanent dossier');
 await owner.locator('[data-db-add]').click();
 await input(owner,'name').fill('Direct Database Fixture');await owner.locator('#catalogEditorDialog [data-editor-category]').selectOption('items');
 await input(owner,'last_checked').fill('2026-10-02');await save(owner);
 const id=await owner.evaluate(()=>CATALOG_DATA.entries.find(e=>e.name_de==='Direct Database Fixture').id);
 ok((await row(id)).revision===1&&(await row(id)).entry.last_checked==='2026-10-02','Add uses existing stable ID/create logic and saves the existing checked date field');
 ok(await owner.locator('[data-entry="'+id+'"]').count()===1&&await owner.locator('#catalogDetailTitle').innerText()==='Direct Database Fixture','New entry immediately appears selected in card and dossier');
 await close(owner);await owner.locator('[data-db-add]').click();await input(owner,'name').fill('Direct Database Fixture');await owner.locator('#catalogEditorDialog [data-editor-category]').selectOption('items');await owner.locator('#catalogEditorDialog [data-editor-save]').click();
 ok((await owner.locator('#catalogEditorDialog [data-editor-status]').innerText()).includes('gleichnamiger Eintrag'),'Direct create retains the shared duplicate check');await close(owner);
 await search(owner,foxId);await owner.locator('.catalog-card [data-db-edit]').click();
 const old=await row(foxId);await db.query('update catalog_entries set revision=revision+1 where id=$1',[foxId]);
 await input(owner,'description').fill('Rejected stale direct edit');await owner.locator('#catalogEditorDialog [data-editor-save]').click();
 await owner.waitForFunction(()=>document.querySelector('#catalogEditorDialog [data-editor-status] p')?.textContent.includes('geändert'));
 ok((await row(foxId)).entry.description!=='Rejected stale direct edit','Shared modal rejects a stale revision without overwriting');await close(owner);
 await owner.evaluate(async()=>{await JMA_CATALOG.load();JMA_RENDER()});await search(owner,foxId);
 await owner.locator('.catalog-card [data-db-archive]').click();await owner.waitForSelector('[data-archive-confirm]:not([disabled])');
 ok((await owner.locator('[data-archive-links]').innerText()).includes('catalog:cat-tier-fuchs'),'Archive confirmation shows actual existing central image relationship');
 await owner.locator('[data-archive-cancel]').click();ok((await row(foxId)).entry.archived!==true,'Cancel performs no archive write');
 await owner.locator('.catalog-card [data-db-archive]').click();await owner.waitForSelector('[data-archive-confirm]:not([disabled])');await owner.locator('[data-archive-confirm]').click();await owner.waitForSelector('#catalogArchiveDialog',{state:'detached'});
 ok((await row(foxId)).entry.archived===true&&await owner.locator('[data-entry="'+foxId+'"]').count()===0,'Archive is persisted on the existing row, then hidden from normal database');
 await user.reload();await user.waitForSelector('#catalogSearch');await search(user,foxId);
 ok(await user.locator('[data-entry="'+foxId+'"]').count()===0,'User reload preserves archive exclusion');
 await owner.reload();await owner.waitForSelector('[data-db-mode]');await owner.locator('[data-db-mode]').click();await owner.locator('#catalogArchived').check();await search(owner,foxId);
 ok(await owner.locator('[data-entry="'+foxId+'"] [data-db-archive]').innerText()==='↶ Wiederherstellen','Persisted archived row is recoverable after reload');
 await owner.locator('.catalog-card [data-db-archive]').click();await owner.waitForSelector('[data-archive-confirm]:not([disabled])');await owner.locator('[data-archive-confirm]').click();await owner.waitForSelector('#catalogArchiveDialog',{state:'detached'});await owner.locator('#catalogArchived').uncheck();
 ok((await row(foxId)).entry.archived===false,'Restore reverses the archive through the same revision-protected update');
 ok(JSON.stringify((await db.query("select * from asset_library where id='catalog:cat-tier-fuchs'")).rows[0])===JSON.stringify(assetBefore),'Archive/restore leaves original linked asset, Storage pointer and asset revision intact');
 await search(owner,foxId);await owner.locator('#catalogDossier [data-db-asset]').click();
 await owner.waitForFunction(()=>document.querySelector('[data-asset-field="id"]')?.value==='catalog:cat-tier-fuchs'&&!document.querySelector('[data-asset-save]')?.disabled);
 ok(await field(owner,'catalog_id').inputValue()===foxId,'Dossier asset action selects the existing exact Fuchs asset in the existing library');
 await database(owner);await owner.locator('[data-db-mode]').click();await search(owner,id);await owner.locator('.catalog-card [data-db-edit]').click();await owner.waitForSelector('#catalogEditorDialog [data-editor-image]:not([disabled])');await owner.locator('#catalogEditorDialog [data-editor-image]').click();
 await owner.waitForSelector('[data-asset-field="id"]');
 ok(await field(owner,'catalog_id').inputValue()===id&&await field(owner,'id').inputValue()==='catalog:'+id&&await field(owner,'asset_type').inputValue()==='item','Entry without an asset opens a prefilled draft in the existing single-upload library');
 for(const width of [1920,390,360]){
  const p=await pageFor('owner',width);p.on('pageerror',e=>errors.push(e.message));await p.setViewportSize({width,height:width===390?844:width===360?780:1080});await database(p);await p.locator('[data-db-mode]').click();await search(p,foxId);if(width===390){await p.locator('.catalog-card [data-db-edit]').tap()}else await p.locator('.catalog-card [data-db-edit]').click();
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#catalogEditorDialog').scrollWidth<=document.querySelector('#catalogEditorDialog').clientWidth),width+' database/modal have no horizontal overflow');
  await p.locator('#catalogEditorDialog [data-editor-save]').scrollIntoViewIfNeeded();
  ok(await p.locator('#catalogEditorDialog [data-editor-save]').boundingBox().then(b=>b.x>=0&&b.x+b.width<=width&&b.height>=44),width+' save action fits and has a 44px touch target');
  await p.screenshot({path:path.join(out,'database-direct-editor-'+width+'.png')});
  await p.keyboard.press('Tab');ok(await p.evaluate(()=>document.activeElement.closest('#catalogEditorDialog')!==null),width+' keyboard focus stays inside native modal');
  await close(p);await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await p.screenshot({path:path.join(out,'database-dossier-'+width+'.png'),fullPage:true});
  if(width===390){await p.locator('.catalog-card [data-db-edit]').tap();await input(p,'kind').fill('Tier / Touch-Prüfung');await p.locator('#catalogEditorDialog [data-editor-save]').tap();await p.waitForFunction(()=>document.querySelector('#catalogEditorDialog [data-editor-status] p')?.textContent.includes('wurde in Supabase gespeichert'));ok((await row(foxId)).entry.kind==='Tier / Touch-Prüfung','390px touch opens, edits and saves through the shared editor');await close(p)}
 }
 // Keep fixture writes distinct from production data and verify untouched JSON fields survived.
 const final=await row(foxId);ok(final.entry.id===original.id&&JSON.stringify(final.entry.tags)===JSON.stringify(original.entry.tags)&&JSON.stringify(final.entry.sources)===JSON.stringify(original.entry.sources)&&final.entry.image===original.entry.image,'Direct edits preserve stable Fuchs ID, tags, sources and legacy fallback');
 ok(errors.length===0,'No direct database/browser exceptions: '+errors.join('; '));
 console.log('PASS database-admin checks:',checks);
};
