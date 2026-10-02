(()=>{
'use strict';
const model=globalThis.ASSET_LIBRARY_MODEL;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
let scope='',generation=0,rows=[],working=null,base=null,metadataDraft=null,creating=false,phase='idle',message='',failed=false,saving=false;
let upload=null,uploadUrl='',uploadInfo=null,uploadTicket=0,checkingUpload=false,uploadMessage='';
let requestedAsset='';
function clearUpload(){
  uploadTicket++;if(uploadUrl)URL.revokeObjectURL(uploadUrl);
  upload=null;uploadUrl='';uploadInfo=null;checkingUpload=false;uploadMessage='';
}
const filters={search:'',type:'',category:'',status:''};
const auth=()=>globalThis.JMA_AUTH?.getState?.()||{};
const canEdit=()=>['moderator','admin','owner'].includes(auth().role);
function ensureScope(){
  const next=[auth().user?.id,auth().role].join(':');
  if(scope===next)return;
  clearUpload();scope=next;generation++;rows=[];working=base=null;metadataDraft=null;requestedAsset='';creating=false;phase='idle';message='';failed=false;saving=false;
}
function merged(){
  const all=new Map(model.inventory().map(r=>[r.id,r]));
  for(const row of rows)all.set(row.id,{...row,persisted:true});
  return [...all.values()].sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name,'de'));
}
async function load(){
  if(phase==='loading')return;
  phase='loading';const ticket=generation;
  try{
    const result=await globalThis.JMA_ASSET_STORE.load();
    if(ticket!==generation)return;
    rows=result;phase='ready';failed=false;message='Supabase verbunden. Änderungen werden mit Revisionsschutz gespeichert.';
  }catch(error){
    if(ticket!==generation)return;
    phase='unavailable';failed=true;
    message=error?.code==='PGRST205'?'Die Asset-Tabelle ist noch nicht eingerichtet. Der erkannte Bestand ist lesbar; Speichern wird nach der SQL-Migration verfügbar.':'Asset-Bibliothek nicht erreichbar. Bestand bleibt lesbar; Speichern ist gesperrt. '+(error?.message||'');
  }
  if(!working){const all=merged();working=structuredClone(all.find(row=>row.id===requestedAsset)||all[0]||null);base=structuredClone(working);requestedAsset=''}
  if(location.hash.split('?')[0]==='#/admin')globalThis.JMA_RENDER?.();
}
const options=(values,selected,empty)=>`${empty?'<option value="">'+esc(empty)+'</option>':''}${Object.entries(values).map(([id,name])=>'<option value="'+esc(id)+'"'+(id===selected?' selected':'')+'>'+esc(name)+'</option>').join('')}`;
function form(){
  if(!working)return '<p>Ein Asset auswählen oder neu anlegen.</p>';
  const w=working;
  const field=(name,label,value,attrs='')=>'<label>'+label+'<input data-asset-field="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
  return '<form class="admin-editor-form asset-form" data-asset-form>'+field('id','Stabile ID',w.id,'required maxlength="160"'+(!creating?' readonly':''))+
    field('name','Name',w.name,'required maxlength="200"')+
    '<label>Typ<select data-asset-field="asset_type">'+options(model.types,w.asset_type)+'</select></label>'+field('category','Kategorie',w.category,'maxlength="80"')+
    '<label>Status<select data-asset-field="status">'+options(model.statuses,w.status)+'</select></label>'+field('sort_order','Sortierung',w.sort_order,'type="number" min="-100000" max="100000" step="1" required')+
    '<label class="wide asset-release"><input type="checkbox" data-asset-release'+(w.status==='active'?' checked':'')+'> Für Benutzer verfügbar: <b data-asset-release-label>'+(w.status==='active'?'JA':'NEIN')+'</b></label>'+
    field('file_ref','Bestehende Bildreferenz unter assets/',w.file_ref||'','maxlength="512"'+(w.storage_path?' readonly':''))+field('catalog_id','Katalog-ID (optional)',w.catalog_id||'','maxlength="120"')+
    '<label class="wide asset-upload">Einzelne Bilddatei<input type="file" data-asset-file accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"'+(saving?' disabled':'')+'><span class="asset-note">PNG / JPEG / WebP · maximal 8 MiB · Originaldatei bleibt unverändert.</span></label>'+
    '<div class="wide asset-upload-state"><p class="asset-note" data-asset-upload-message role="status">'+esc(uploadMessage||(w.storage_path?'Gespeichert: '+w.storage_bucket+'/'+w.storage_path:'Keine lokale Datei ausgewählt.'))+'</p><button class="admin-secondary" type="button" data-asset-file-clear'+(!upload&&!checkingUpload?' hidden':'')+'>Dateiauswahl verwerfen</button></div>'+
    '<label class="wide">Metadaten (JSON-Objekt)<textarea data-asset-field="metadata" rows="5" spellcheck="false">'+esc(metadataDraft??JSON.stringify(w.metadata,null,2))+'</textarea></label>'+
    '<p class="wide asset-note">'+(w.persisted?'Revision '+w.revision+' · Geändert '+esc(w.updated_at||''):'Erkannter Originalbestand / neuer Datensatz · noch nicht in der Bibliothek gespeichert')+'</p>'+
    '<button class="admin-primary wide" data-asset-save type="submit"'+(phase!=='ready'||saving||checkingUpload?' disabled':'')+'>'+(saving?'Speichert …':'In Supabase speichern')+'</button></form>';
}
function render(){
  ensureScope();if(!canEdit())return '';
  const all=merged();if(!working&&all.length&&['ready','unavailable'].includes(phase)){working=structuredClone(all[0]);base=structuredClone(working)}
  const busy=saving||phase==='idle'||phase==='loading';
  const categories=Object.fromEntries([...new Set(all.map(r=>r.category).filter(Boolean))].sort().map(v=>[v,v]));
  return '<section class="admin-section asset-library"><header class="admin-section-heading"><div><span class="eyebrow">ASSETS & CONTENT</span><h2>Asset-Bibliothek</h2><p>Bestehende Quellen, zentrale Metadaten und manueller Einzelupload.</p></div><div class="asset-actions"><button type="button" class="admin-secondary" data-asset-reload'+(busy?' disabled':'')+'>Neu laden</button><button type="button" class="admin-primary" data-asset-new'+(busy?' disabled':'')+'>+ Neues Asset</button></div></header>'+
    '<p class="asset-connection" role="status" aria-live="polite" data-asset-message>'+esc(message||(phase==='idle'||phase==='loading'?'Asset-Metadaten werden aus Supabase geladen …':''))+'</p>'+
    '<div class="asset-library-layout"><section class="admin-glass asset-library-center"><div class="asset-filters"><label>Suche<input type="search" data-asset-search value="'+esc(filters.search)+'" placeholder="Name, ID, Metadaten"></label>'+[
      ['type','Typ',model.types,filters.type],['category','Kategorie',categories,filters.category],['status','Status',model.statuses,filters.status]
    ].map(([key,label,values,value])=>'<label>'+label+'<select data-asset-filter="'+key+'">'+options(values,value,'Alle')+'</select></label>').join('')+'</div>'+
    '<p data-asset-count></p><div class="asset-list" aria-label="Assets">'+all.map(r=>'<button type="button" class="asset-row'+(r.id===working?.id?' selected':'')+'" data-asset-open="'+esc(r.id)+'"'+(busy?' disabled':'')+'><span class="asset-thumb">'+imageMarkup(r,'',true)+'</span><span><strong>'+esc(r.name)+'</strong><small>'+esc(model.types[r.asset_type]||r.asset_type)+' · '+esc(r.category)+'</small><small>'+esc(r.id)+'</small></span><span class="asset-status status-'+esc(r.status)+'">'+esc(model.statuses[r.status])+'<small>Benutzer: '+(r.status==='active'?'JA':'NEIN')+'</small></span></button>').join('')+'</div><p data-asset-empty hidden>Keine passenden Assets.</p><div class="asset-edit"><h3>Metadaten bearbeiten</h3>'+form()+'</div></section>'+
    '<aside class="admin-glass asset-preview" aria-label="Reine Asset-Vorschau"><span class="eyebrow">LIVE-VORSCHAU · ENTWURF / GESPEICHERTES ASSET</span><div data-asset-preview></div><p class="asset-note">Freigabe steuert die Bibliothek. Bestehende Profil-Auswahl und gespeicherte Zuordnungen bleiben erhalten; ihre Anbindung folgt separat.</p></aside></div></section>';
}
function imageMarkup(row,cls='',thumb=false){
  if(!row)return '';
  const local=!thumb&&row.id===working?.id&&uploadUrl;
  const src=local?uploadUrl:row.file_ref&&model.fileAllowed(row.file_ref)?'./'+row.file_ref:'';
  if(!src&&!row.storage_path)return thumb?'<b>'+esc(row.metadata?.icon||'◇')+'</b>':'';
  return '<img class="'+cls+'"'+(thumb?' loading="lazy"':'')+(src?' src="'+esc(src)+'"':'')+(!src?' data-asset-image="'+esc(row.id)+'" data-asset-purpose="'+esc(row.asset_type)+'"':'')+' alt="'+(thumb?'':esc(row.name))+'">';
}
function hydrateImages(root=document){
  const all=new Map(merged().map(r=>[r.id,r]));if(working)all.set(working.id,working);
  root.querySelectorAll('[data-asset-image]').forEach(async img=>{
    const row=all.get(img.dataset.assetImage),purpose=img.dataset.assetPurpose;
    try{
      const url=await globalThis.JMA_ASSET_STORE.imageUrl(row,purpose);
      if(!img.isConnected)return;if(url)img.src=url;else throw Error('Bild nicht verfügbar.');
    }catch{if(img.isConnected){img.hidden=true;img.parentElement.dataset.imageError='Storage-Bild nicht erreichbar'}}
  });
}
function preview(){
  const target=document.querySelector('[data-asset-preview]');if(!target||!working)return;
  const w=working;
  let visual='';
  if(model.profileTypes.has(w.asset_type)){
    const all=merged(),pick=type=>w.asset_type===type?w:all.find(r=>r.asset_type===type&&r.status==='active');
    const av=pick('avatar'),frame=pick('frame'),banner=pick('banner');
    const legacy=w.metadata?.legacy_id;
    const ring=w.asset_type==='ring'&&['cyan','red','gold'].includes(legacy)?legacy:'none';
    const wreath=w.asset_type==='wreath'&&['orbit','laurel'].includes(legacy)?legacy:'none';
    // Reuse the real profile avatar markup/styles without altering account appearance.
    const template=document.createElement('template');template.innerHTML=globalThis.JMA_PROFILE.avatar({avatar:'none',frame:'none',ring,wreath,color:'cyan'});
    const shell=template.content.querySelector('.profile-avatar');shell.querySelector('b')?.remove();
    for(const [row,cls]of [[av,'avatar-image'],[frame,'avatar-frame']])shell.insertAdjacentHTML('beforeend',imageMarkup(row,cls));
    visual='<div class="asset-profile-scene">'+(imageMarkup(banner)?'<div class="asset-profile-banner">'+imageMarkup(banner)+'</div>':'')+'<div class="asset-profile-identity"><div class="asset-profile-avatar">'+template.innerHTML+'</div><strong>'+esc(w.name||'Profilvorschau')+'</strong>'+(w.asset_type==='trophy'?'<span class="asset-trophy">'+esc(w.metadata?.icon||'◇')+'</span>':'')+'</div></div>';
    // CSS decorations retain the existing profile preview; their uploaded raster is also inspectable.
    if(!['avatar','frame','banner'].includes(w.asset_type)&&imageMarkup(w))visual+='<div class="asset-image-preview">'+imageMarkup(w)+'</div>';
  }else visual='<div class="asset-image-preview">'+(imageMarkup(w)||'<p>Keine Bildreferenz</p>')+'</div>';
  target.innerHTML=visual+'<h3>'+esc(w.name||'Ohne Namen')+'</h3><p>'+esc(model.types[w.asset_type])+' · '+esc(w.category)+'</p><p><b>'+esc(model.statuses[w.status])+'</b> · Für Benutzer: <strong>'+(w.status==='active'?'JA':'NEIN')+'</strong></p><p class="asset-note">'+esc(uploadInfo?'Lokale Vorschau: '+uploadInfo.original_name:w.file_ref||(w.storage_path?w.storage_bucket+'/'+w.storage_path:'CSS / Fortschrittsdarstellung'))+(w.catalog_id?' · Katalog: '+esc(w.catalog_id):'')+'</p><pre>'+esc(JSON.stringify(w.metadata,null,2))+'</pre>';
  hydrateImages(target);
  target.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.parentElement.dataset.imageError='Bild nicht erreichbar'},{once:true}));
}
function applyFilters(){
  const all=new Map(merged().map(r=>[r.id,r]));let count=0;
  document.querySelectorAll('[data-asset-open]').forEach(button=>{
    const r=all.get(button.dataset.assetOpen),text=[r.id,r.name,r.category,JSON.stringify(r.metadata)].join(' ').toLocaleLowerCase('de');
    const visible=(!filters.search||text.includes(filters.search.toLocaleLowerCase('de')))&&(!filters.type||r.asset_type===filters.type)&&(!filters.category||r.category===filters.category)&&(!filters.status||r.status===filters.status);
    button.hidden=!visible;if(visible)count++;
  });
  const label=document.querySelector('[data-asset-count]');if(label)label.textContent=count+' / '+all.size+' Assets';
  const empty=document.querySelector('[data-asset-empty]');if(empty)empty.hidden=count>0;
}
function discard(){return !working||!base||(!upload&&!checkingUpload&&JSON.stringify(working)===JSON.stringify(base)&&(metadataDraft===null||metadataDraft===JSON.stringify(base.metadata,null,2)))||window.confirm('Ungespeicherte Asset-Änderungen verwerfen?')}
function readForm(){
  const form=document.querySelector('[data-asset-form]');if(!form||!working)return;
  for(const el of form.querySelectorAll('[data-asset-field]')){
    const key=el.dataset.assetField;
    if(key==='metadata'){metadataDraft=el.value;try{working.metadata=JSON.parse(el.value)}catch{continue}}
    else working[key]=key==='sort_order'?Number(el.value):['file_ref','catalog_id'].includes(key)?el.value||null:el.value;
  }
}
function bind(){
  ensureScope();if(!canEdit()||!document.querySelector('.asset-library'))return;
  preview();applyFilters();
  document.querySelector('[data-asset-search]').addEventListener('input',event=>{filters.search=event.target.value;applyFilters()});
  document.querySelectorAll('[data-asset-filter]').forEach(el=>el.addEventListener('change',()=>{filters[el.dataset.assetFilter]=el.value;applyFilters()}));
  document.querySelectorAll('[data-asset-open]').forEach(el=>el.addEventListener('click',()=>{readForm();if(saving||!discard())return;clearUpload();working=structuredClone(merged().find(r=>r.id===el.dataset.assetOpen));base=structuredClone(working);metadataDraft=null;creating=false;globalThis.JMA_RENDER?.()}));
  document.querySelector('[data-asset-new]').addEventListener('click',()=>{if(beginNew()){globalThis.JMA_RENDER?.();document.querySelector('[data-asset-field="name"]')?.focus()}});
  document.querySelector('[data-asset-reload]').addEventListener('click',()=>{readForm();if(saving||!discard())return;clearUpload();working=base=null;metadataDraft=null;creating=false;load();globalThis.JMA_RENDER?.()});
  const form=document.querySelector('[data-asset-form]');
  // Restore the native filename after an ordinary render; the original File stays in memory.
  if(upload&&form){try{const selection=new DataTransfer();selection.items.add(upload);form.querySelector('[data-asset-file]').files=selection.files}catch{/* The explicit selection label remains available. */}}
  form?.addEventListener('input',event=>{if(event.target.matches('[data-asset-release],[data-asset-file]'))return;readForm();const checkbox=form.querySelector('[data-asset-release]');checkbox.checked=working.status==='active';form.querySelector('[data-asset-release-label]').textContent=checkbox.checked?'JA':'NEIN';preview()});
  form?.querySelector('[data-asset-release]').addEventListener('change',event=>{working.status=event.target.checked?'active':working.status==='active'?'inactive':working.status;form.querySelector('[data-asset-field="status"]').value=working.status;form.querySelector('[data-asset-release-label]').textContent=event.target.checked?'JA':'NEIN';preview()});
  form?.querySelector('[data-asset-file]').addEventListener('change',async event=>{
    if(saving)return;readForm();clearUpload();
    const file=event.target.files?.[0];if(!file){preview();return}
    const ticket=uploadTicket;checkingUpload=true;uploadMessage='Bilddatei wird geprüft …';
    globalThis.JMA_RENDER?.();
    try{
      const info=await model.inspectUpload(file);if(ticket!==uploadTicket)return;
      upload=file;uploadInfo=info;uploadUrl=URL.createObjectURL(file);
      uploadMessage=info.original_name+' · '+info.width+' × '+info.height+' · '+(info.size/1024/1024).toFixed(2)+' MiB · noch nicht gespeichert';
    }catch(error){if(ticket===uploadTicket)uploadMessage=error.message}
    finally{if(ticket===uploadTicket){checkingUpload=false;globalThis.JMA_RENDER?.()}}
  });
  form?.querySelector('[data-asset-file-clear]').addEventListener('click',()=>{if(saving)return;readForm();clearUpload();globalThis.JMA_RENDER?.()});
  form?.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||checkingUpload||phase!=='ready')return;readForm();
    const ticket=generation;const button=form.querySelector('[data-asset-save]');
    try{
      // Parse explicitly: invalid JSON must never silently save the last valid value.
      working.metadata=JSON.parse(form.querySelector('[data-asset-field="metadata"]').value);
      const row=model.validate(working,Boolean(upload));saving=true;button.disabled=true;button.textContent='Speichert …';
      message='Supabase-Speicherung läuft …';failed=false;
      const status=document.querySelector('[data-asset-message]');status.textContent=message;status.classList.remove('error');
      form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);
      document.querySelectorAll('[data-asset-new],[data-asset-reload],[data-asset-open]').forEach(el=>el.disabled=true);
      if(!upload&&row.file_ref&&row.file_ref!==base?.file_ref){const image=new Image();image.src='./'+row.file_ref;try{await image.decode()}catch{throw Error('Bildreferenz nicht erreichbar oder beschädigt.')}}
      const saved=await globalThis.JMA_ASSET_STORE.save(row,base?.persisted?base.revision:null,upload);
      if(ticket!==generation)return;
      clearUpload();rows=rows.filter(r=>r.id!==saved.id);rows.push(saved);working={...structuredClone(saved),persisted:true};base=structuredClone(working);metadataDraft=null;creating=false;
      message='Asset '+saved.id+' in Supabase gespeichert · Revision '+saved.revision;failed=false;
    }catch(error){if(ticket===generation){
      if(error.assetDraft){const draft=error.assetDraft;rows=rows.filter(r=>r.id!==draft.id);rows.push(draft);base={...structuredClone(draft),persisted:true};working.persisted=true;working.revision=draft.revision;working.status=draft.status;creating=false}
      message=error.message||'Asset konnte nicht gespeichert werden.';failed=true
    }}
    finally{if(ticket===generation){saving=false;globalThis.JMA_RENDER?.()}}
  });
  const status=document.querySelector('[data-asset-message]');status.classList.toggle('error',failed);
  document.querySelectorAll('.asset-thumb img').forEach(img=>img.addEventListener('error',()=>{const placeholder=document.createElement('b');placeholder.textContent='◇';placeholder.title='Bestehende Bildreferenz nicht erreichbar';img.replaceWith(placeholder)},{once:true}));
  hydrateImages(document.querySelector('.asset-list'));
  if(phase==='idle')load();
}
function beginNew(values={}){
  ensureScope();readForm();if(!canEdit()||saving||!discard())return false;
  clearUpload();requestedAsset='';
  working={id:'asset-'+crypto.randomUUID(),name:'',asset_type:'image',category:'',file_ref:null,catalog_id:null,status:'draft',sort_order:0,metadata:{},persisted:false,...values};
  base=structuredClone(working);metadataDraft=null;creating=true;return true;
}
function newCatalog(entry){
  if(!entry?.id)return false;
  const asset_type=({items:'item',weapons:'weapon',resources:'resource',deviations:'deviation'})[entry.category]||'catalog';
  if(!beginNew({id:'catalog:'+entry.id,name:entry.name_de,asset_type,category:entry.category,catalog_id:entry.id}))return false;
  filters.search='catalog:'+entry.id;filters.type=filters.category=filters.status='';
  return true;
}
function select(id){
  ensureScope();if(!canEdit()||saving||typeof id!=='string')return false;
  readForm();if(!discard())return false;
  clearUpload();generation++;working=base=null;metadataDraft=null;creating=false;requestedAsset=id;phase='idle';
  filters.search=id;filters.type=filters.category=filters.status='';
  return true;
}
globalThis.ASSET_LIBRARY=Object.freeze({render,bind,select,newCatalog});
})();
