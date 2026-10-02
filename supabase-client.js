(()=>{
'use strict';

const PROJECT_URL = 'https://pmoazkdpkxveloespevd.supabase.co';
const PUBLISHABLE_KEY = ['sb','publishable','Yce3SzdU5SpLDJhEvd1PqQ_7LLp2AP9'].join('_');

const state = {
  session: null,
  user: null,
  profile: null,
  role: null,
  account: null,
  ready: false,
  recovery: false
};

let client = null;
let initialized = false;
let authSubscription = null;
let syncChain = Promise.resolve();
const recoveryHandlers = new Set();

function getClient(){
  if(client) return client;
  const createClient = globalThis.supabase?.createClient;
  if(typeof createClient !== 'function'){
    throw new Error('Supabase-Bibliothek konnte nicht geladen werden.');
  }
  client = createClient(PROJECT_URL, PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

function normalizeAccount(user, profile, role){
  if(!user) return null;
  const email = user.email || '';
  const metadataName = user.user_metadata?.display_name || user.user_metadata?.name || '';
  const emailName = email.includes('@') ? email.split('@')[0] : '';
  return {
    id: user.id,
    email,
    name: profile?.display_name || metadataName || emailName || 'Meta-Human',
    role: role || null,
    avatar: profile?.avatar_url || "", appearance: user.user_metadata?.archive_appearance || {}, created: user.created_at || ""
  };
}

function clearIdentity(){
  state.session = null;
  state.user = null;
  state.profile = null;
  state.role = null;
  state.account = null;
}

async function loadIdentity(session){
  if(!session?.user){
    clearIdentity();
    return null;
  }

  const sb = getClient();
  const user = session.user;
  state.session = session;
  state.user = user;
  state.profile = null;
  state.role = null;
  state.account = normalizeAccount(user, null, null);

  const [profileResult, roleResult] = await Promise.all([
    sb.from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
    sb.from('user_roles')
      .select('user_id, role')
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  if(profileResult.error) throw profileResult.error;
  if(roleResult.error) throw roleResult.error;

  state.profile = profileResult.data || null;
  state.role = roleResult.data?.role || null;
  state.account = normalizeAccount(user, state.profile, state.role);
  return state.account;
}

function queueSessionSync(session, renderAfter=true){
  syncChain = syncChain
    .catch(()=>{})
    .then(()=>loadIdentity(session))
    .then(()=>{
      if(renderAfter) globalThis.JMA_RENDER?.();
      return state.account;
    })
    .catch(error=>{
      console.error('Supabase Auth-Synchronisierung fehlgeschlagen:', error);
      if(renderAfter) globalThis.JMA_RENDER?.();
      return null;
    });
  return syncChain;
}

function notifyRecovery(){
  recoveryHandlers.forEach(handler=>{
    try{ handler(); }catch(error){ console.error('Recovery-Handler fehlgeschlagen:', error); }
  });
}

async function handleRecoverySession(session){
  await queueSessionSync(session, false);
  state.recovery = true;
  notifyRecovery();
}

function onRecovery(handler){
  if(typeof handler !== 'function') return ()=>{};
  recoveryHandlers.add(handler);
  if(state.recovery) setTimeout(()=>handler(), 0);
  return ()=>recoveryHandlers.delete(handler);
}

function isRecovery(){
  return state.recovery;
}

async function init(){
  if(initialized) return state;
  const sb = getClient();

  const listener = sb.auth.onAuthStateChange((event, session)=>{
    if(event === 'PASSWORD_RECOVERY'){
      setTimeout(()=>handleRecoverySession(session), 0);
      return;
    }
    if(!initialized) return;
    setTimeout(()=>queueSessionSync(session, true), 0);
  });
  authSubscription = listener.data?.subscription || null;

  const {data, error} = await sb.auth.getSession();
  if(error) throw error;
  await loadIdentity(data.session);

  initialized = true;
  state.ready = true;
  return state;
}

async function signUp(email, password, displayName){
  const sb = getClient();
  const name = String(displayName || '').trim() || 'Meta-Human';
  const {data, error} = await sb.auth.signUp({
    email: String(email || '').trim(),
    password,
    options: {
      data: {
        display_name: name
      }
    }
  });
  if(error) throw error;

  if(data.session){
    await loadIdentity(data.session);
  }else{
    state.session = null;
    state.user = data.user || null;
    state.profile = null;
    state.role = null;
    state.account = null;
  }

  return {
    user: data.user || null,
    session: data.session || null,
    account: state.account,
    requiresEmailConfirmation: !data.session
  };
}

async function signInWithPassword(email, password){
  const sb = getClient();
  const {data, error} = await sb.auth.signInWithPassword({
    email: String(email || '').trim(),
    password
  });
  if(error) throw error;
  await loadIdentity(data.session);
  return state.account;
}

async function signOut(){
  const sb = getClient();
  const {error} = await sb.auth.signOut();
  if(error) throw error;
  clearIdentity();
  return true;
}

async function resetPasswordForEmail(email){
  const sb = getClient();
  const {error} = await sb.auth.resetPasswordForEmail(
    String(email || '').trim(),
    {redirectTo: 'https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html'}
  );
  if(error) throw error;
  return true;
}

async function updatePassword(password){
  if(!state.session?.user && !state.user) throw new Error('Keine gültige Recovery-Sitzung.');
  const sb = getClient();
  const {data, error} = await sb.auth.updateUser({password});
  if(error) throw error;
  if(data.user) state.user = data.user;
  return data.user || state.user;
}

async function finishRecovery(){
  await signOut();
  state.recovery = false;
  return true;
}

const CATALOG_WRITE_ROLES = new Set(['moderator', 'admin', 'owner']);
const catalogRevisions = new Map();

function requireCatalogEditor(){
  if(!state.user || !state.session) throw new Error('Bitte zuerst im Archiv anmelden.');
  if(!CATALOG_WRITE_ROLES.has(state.role)) throw new Error('Für Katalogänderungen ist eine Moderator-, Admin- oder Owner-Rolle erforderlich.');
}

function validateCatalogEntry(entry){
  if(!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Ungültiger Katalogdatensatz.');
  if(typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(entry.id)) throw new Error('Ungültige Eintrags-ID.');
  const categories=globalThis.CATALOG_DATA?.categories;
  if(!Array.isArray(categories) || !categories.some(category=>category.id===entry.category)) throw new Error('Bitte eine vorhandene Kategorie auswählen.');
  if(typeof entry.name_de!=='string' || !entry.name_de.trim() || entry.name_de.trim().length>200) throw new Error('Name muss 1 bis 200 Zeichen enthalten.');
  for(const field of ['kind','description','acquisition','status']){
    if(entry[field]!==undefined && (typeof entry[field]!=='string' || entry[field].length>5000)) throw new Error('Ungültiger Text im Feld „'+field+'“.');
  }
  if(entry.tags!==undefined && (!Array.isArray(entry.tags) || entry.tags.length>50 || entry.tags.some(tag=>typeof tag!=='string' || tag.length>80))) throw new Error('Tags müssen aus höchstens 50 Textwerten mit maximal 80 Zeichen bestehen.');
  if(entry.archived!==undefined && typeof entry.archived!=='boolean') throw new Error('Ungültiger Archivstatus.');
  if(entry.last_checked!==undefined && (typeof entry.last_checked!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.last_checked) || !Number.isFinite(Date.parse(entry.last_checked)))) throw new Error('Ungültiges Prüfdatum.');
  if(entry.image!==undefined && entry.image!==null && (typeof entry.image!=='string' || !/^assets\/.+\.(png|webp|jpg|jpeg|svg)$/i.test(entry.image) || entry.image.includes('..') || entry.image.includes('\\') || /[?#\u0000]/.test(entry.image))) throw new Error('Ungültiger lokaler Bildpfad. Ohne Bild den Pfad leeren.');
  return entry;
}

function mergeCatalogEntry(entry){
  const entries=Array.isArray(globalThis.CATALOG_DATA?.entries)?globalThis.CATALOG_DATA.entries:[];
  const index=entries.findIndex(item=>item.id===entry.id);
  if(index<0) entries.push(entry);
  else entries[index]=entry;
  globalThis.CATALOG_DATA.entries=entries;
}

async function loadCatalog(){
  const rows=[];
  const pageSize=500;
  for(let start=0;;start+=pageSize){
    const {data,error}=await getClient().from('catalog_entries')
      .select('id, entry, revision, updated_at')
      .order('id',{ascending:true})
      .range(start,start+pageSize-1);
    if(error) throw error;
    const page=Array.isArray(data)?data:[];
    rows.push(...page);
    if(page.length<pageSize) break;
  }
  const byId=new Map();
  for(const item of globalThis.CATALOG_DATA?.entries||[]) byId.set(item.id,item);
  catalogRevisions.clear();
  for(const row of rows){
    if(!row || typeof row.id!=='string' || !row.entry || row.entry.id!==row.id) throw new Error('Supabase lieferte einen ungültigen Katalogdatensatz.');
    byId.set(row.id,row.entry);
    catalogRevisions.set(row.id,Number(row.revision)||1);
  }
  globalThis.CATALOG_DATA.entries=[...byId.values()];
  return globalThis.CATALOG_DATA.entries;
}

function catalogRevision(id){return catalogRevisions.get(id)||1}

async function createCatalogEntry(entry){
  requireCatalogEditor();
  validateCatalogEntry(entry);
  const {data,error}=await getClient().from('catalog_entries')
    .insert({id:entry.id,entry,updated_by:state.user.id})
    .select('id, entry, revision, updated_at')
    .single();
  if(error){
    if(error.code==='23505') throw new Error('Diese Eintrags-ID existiert bereits. Lade den Katalog neu, bevor du weiterarbeitest.');
    throw error;
  }
  catalogRevisions.set(data.id,Number(data.revision)||1);
  mergeCatalogEntry(data.entry);
  return data;
}

async function updateCatalogEntry(entry,expectedRevision){
  requireCatalogEditor();
  validateCatalogEntry(entry);
  if(!Number.isInteger(expectedRevision) || expectedRevision<1) throw new Error('Die geladene Datensatzversion fehlt. Bitte Katalog neu laden.');
  const nextRevision=expectedRevision+1;
  const {data,error}=await getClient().from('catalog_entries')
    .update({entry,revision:nextRevision,updated_at:new Date().toISOString(),updated_by:state.user.id})
    .eq('id',entry.id)
    .eq('revision',expectedRevision)
    .select('id, entry, revision, updated_at')
    .maybeSingle();
  if(error) throw error;
  if(!data) throw new Error('Dieser Eintrag wurde seit dem Laden geändert. Lade ihn neu, damit keine fremde Änderung überschrieben wird.');
  catalogRevisions.set(data.id,Number(data.revision)||nextRevision);
  mergeCatalogEntry(data.entry);
  return data;
}

async function updateDisplayName(displayName){
  if(!state.user) throw new Error('Keine aktive Anmeldung.');
  const name = String(displayName || '').trim();
  if(!name) throw new Error('Anzeigename darf nicht leer sein.');

  const sb = getClient();
  const {data, error} = await sb.from('profiles')
    .update({display_name: name})
    .eq('id', state.user.id)
    .select('id, display_name, avatar_url')
    .single();
  if(error) throw error;

  state.profile = data;
  state.account = normalizeAccount(state.user, state.profile, state.role);
  return state.account;
}

async function updateProfile({name,avatar,appearance}){
 if(!state.user) throw new Error('Keine aktive Anmeldung.');
 name=String(name||'').trim();if(name.length<2||name.length>48)throw new Error('Anzeigename benötigt 2 bis 48 Zeichen.');
 if(JSON.stringify(appearance).length>3500)throw new Error('Profilgestaltung ist zu groß.');
 const allowed=(globalThis.PROFILE_ASSETS?.avatars||[]).find(x=>x.id===avatar);
 const {data,error}=await getClient().from('profiles').update({display_name:name,avatar_url:allowed?.src||null}).eq('id',state.user.id).select('id, display_name, avatar_url').single();if(error)throw error;
 state.profile=data;
 const result=await getClient().auth.updateUser({data:{archive_appearance:appearance}});
 if(result.error){state.account=normalizeAccount(state.user,state.profile,state.role);throw new Error('Anzeigename gespeichert; Profilgestaltung konnte nicht gespeichert werden: '+result.error.message)}
 state.user=result.data.user;if(state.session)state.session.user=state.user;
 state.account=normalizeAccount(state.user,state.profile,state.role);return getAccount();
}

function getAccount(){
  return state.account ? {...state.account} : null;
}

function getState(){
  return {
    session: state.session,
    user: state.user,
    profile: state.profile,
    role: state.role,
    account: getAccount(),
    ready: state.ready,
    recovery: state.recovery
  };
}

function destroy(){
  authSubscription?.unsubscribe?.();
  authSubscription = null;
  initialized = false;
  state.ready = false;
}

// Shares the existing authenticated client; no second auth or local write store.
let assetStorageReady=false,imageScope='';
const assetImageUrls=new Map();
let assetRows=null,assetRowsScope='',assetRowsAt=0,assetRowsPending=null,assetRowsVersion=0;
const assetScope=()=>[state.user?.id,state.role].join(':');
function ensureAssetScope(){
  const scope=assetScope();
  if(assetRowsScope!==scope){assetRowsScope=scope;assetRows=null;assetRowsAt=0;assetRowsPending=null;assetRowsVersion++}
  return scope;
}
function requireAssetEditor(){
  if(!state.user||!state.session||!CATALOG_WRITE_ROLES.has(state.role))throw Error('Asset-Verwaltung benötigt eine Moderator-, Admin- oder Owner-Rolle.');
}
async function loadAssets({strict=false}={}){
  const scope=ensureAssetScope(),version=++assetRowsVersion;
  const rows=[],seen=new Set();let total=null;
  if(strict)assetStorageReady=false;
  for(let start=0;;){
    const {data,error,count}=await getClient().from('asset_library').select('*',strict?{count:'exact'}:undefined).order('id',{ascending:true}).range(start,start+499);
    if(error)throw error;
    if(!Array.isArray(data))throw Error('Ungültiges Live-Inventar.');
    if(strict){if(!Number.isInteger(count)||count<0||total!==null&&total!==count)throw Error('STOPP: Live-Inventar unvollständig oder während des Ladens verändert.');total=count}
    if(strict)for(const row of data){if(typeof row.id!=='string'||seen.has(row.id))throw Error('STOPP: Live-Inventar enthält ungültige oder wiederholte IDs.');seen.add(row.id)}
    rows.push(...data);
    if(strict){if(rows.length===total)break;if(!data.length||rows.length>total)throw Error('STOPP: Live-Inventar unvollständig.');start+=data.length}
    else{if(data.length<500)break;start+=500}
  }
  if(strict&&rows.length!==total)throw Error('STOPP: Live-Inventar nicht vollständig geladen.');
  assetStorageReady=rows.length>0&&Object.hasOwn(rows[0],'storage_bucket')&&Object.hasOwn(rows[0],'storage_path');
  if(scope===assetScope()&&version===assetRowsVersion){assetRows=rows;assetRowsAt=Date.now()}
  return rows;
}
async function currentAssets(){
  const scope=ensureAssetScope();
  if(assetRows&&Date.now()-assetRowsAt<45000)return assetRows;
  if(!assetRowsPending){
    const pending=loadAssets().finally(()=>{if(assetRowsPending===pending)assetRowsPending=null});
    assetRowsPending=pending;
  }
  await assetRowsPending;
  if(scope!==assetScope())throw Error('Asset-Sitzung wurde gewechselt.');
  return assetRows||loadAssets();
}
function linkedCatalogAssets(rows,entry,activeOnly){
  const expected=({items:'item',weapons:'weapon',resources:'resource',deviations:'deviation'})[entry?.category]||'catalog';
  return rows.filter(row=>entry?.id&&row.catalog_id===entry.id&&(!activeOnly||row.status==='active')&&
    (row.asset_type===expected||row.asset_type==='catalog'));
}
const canonicalOrder=(a,b,id)=>Number(b.id==='catalog:'+id)-Number(a.id==='catalog:'+id)||
  (a.sort_order||0)-(b.sort_order||0)||(a.id<b.id?-1:a.id>b.id?1:0);
async function catalogAsset(entry){
  if(!entry?.id)return null;
  return (await currentAssets()).filter(row=>row.catalog_id===entry.id).sort((a,b)=>canonicalOrder(a,b,entry.id))[0]||null;
}
async function catalogImage(entry){
  if(!entry?.id)return null;
  const scope=assetScope(),model=globalThis.ASSET_LIBRARY_MODEL;
  const sourceRank=row=>row.storage_bucket===model.storageBucket&&model.storagePathAllowed(row.id,row.storage_path)&&!row.file_ref?0:
    row.file_ref&&model.fileAllowed(row.file_ref)&&!row.storage_path&&!row.storage_bucket?1:2;
  // Release is explicit even for an owner whose RLS SELECT also includes private drafts.
  const candidates=linkedCatalogAssets(await currentAssets(),entry,true)
    .filter(row=>sourceRank(row)<2).sort((a,b)=>sourceRank(a)-sourceRank(b)||canonicalOrder(a,b,entry.id));
  for(const row of candidates){
    try{
      const url=await assetImageUrl(row,row.asset_type);if(!url)continue;
      const image=new Image();image.src=url;await image.decode();
      if(scope!==assetScope())return null;
      return {url,assetId:row.id};
    }catch{/* An unavailable original falls through to the next source or the existing UI fallback. */}
  }
  return null;
}
async function commitAsset(input,expectedRevision=null){
  requireAssetEditor();
  const scope=ensureAssetScope();
  const row=globalThis.ASSET_LIBRARY_MODEL.validate(input);
  if(!assetStorageReady){
    if(row.storage_path)throw Error('Storage-Migration 20261002020000_asset_library_storage.sql fehlt.');
    delete row.storage_bucket;delete row.storage_path;
  }
  let query=getClient().from('asset_library');
  if(expectedRevision===null)query=query.insert({...row,revision:1});
  else{
    if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw Error('Geladene Revision fehlt. Bitte Bibliothek neu laden.');
    const {id,...changes}=row;
    query=query.update({...changes,revision:expectedRevision+1}).eq('id',id).eq('revision',expectedRevision);
  }
  const {data,error,status}=await query.select('*').maybeSingle();
  if(error){
    if(status&&!error.status)error.status=status;
    if(error.code==='23505')throw Error('Asset-ID existiert bereits. Bitte neu laden.');
    if(error.code==='23503')throw Error('Die zugehörige Katalog-ID existiert nicht.');
    throw error;
  }
  if(!data)throw Error('Versionskonflikt: Das Asset wurde zwischenzeitlich geändert. Bitte neu laden; dein Entwurf bleibt erhalten.');
  if(scope===assetScope()){assetRowsVersion++;if(assetRows)assetRows=[...assetRows.filter(row=>row.id!==data.id),data]}
  return data;
}
async function saveAsset(input,expectedRevision=null,file=null,batch=null){
  requireAssetEditor();
  if(!file)return commitAsset(input,expectedRevision);
  const model=globalThis.ASSET_LIBRARY_MODEL;
  if(!assetStorageReady)throw Error('Bitte zuerst 20261002020000_asset_library_storage.sql anwenden und die Bibliothek neu laden.');
  const pauseBeforeUpload=()=>{if(batch?.shouldPause?.()){const error=new Error('Pause vor neuem Upload.');error.batchPaused=true;throw error}};
  const assertScope=()=>{if(batch?.scope&&batch.scope!==assetScope())throw Error('STOPP: Asset-Sitzung während des Uploads gewechselt.')};assertScope();
  const row=model.validate(input,true);batch?.onStage?.('VALIDIERUNG');
  const {info,sha256}=await inspectAssetBytes(file);assertScope();
  if(batch){
    if(row.status!=='draft'||!row.metadata.source_package||!row.metadata.source_path||sha256!==batch.sha256||row.metadata.sha256!==sha256)throw Error('Original-SHA oder Draft-/Source-Metadaten stimmen nicht; nichts gespeichert.');
    if(expectedRevision!==null){const current=await readAsset(row.id);if(!current||current.status!=='draft'||current.file_ref||current.storage_path||!sameAssetSource(current,row))throw Error('Konflikt: Reservierter Draft ist nicht mehr unverändert fortsetzbar.')}
  }
  let reserved=null,uploaded=false;
  try{
    assertScope();pauseBeforeUpload();
    // Reuse the reservation/commit core; existing single-upload images stay current.
    if(!batch){
      if(expectedRevision===null)reserved=await commitAsset({...row,status:'draft',file_ref:null,storage_bucket:null,storage_path:null},null);
    }
    const pending=batch?row.metadata.import_pending:null;
    const path=pending?.storage_path||'library/'+row.id+'/'+crypto.randomUUID()+'.'+info.extension;
    if(batch){
      if(!model.storagePathAllowed(row.id,path)||pending&&pending.sha256!==sha256)throw Error('Konflikt: Reservierte Storage-Absicht passt nicht.');
      const draft={...row,status:'draft',file_ref:null,storage_bucket:null,storage_path:null,metadata:{...row.metadata,import_pending:{storage_path:path,sha256}}};
      reserved=pending?{...draft,revision:expectedRevision}:await commitAsset(draft,expectedRevision);
    }
    let existing=false;
    if(batch&&pending){const stored=await downloadStaged(path);if(stored){const hash=await hashAssetBytes(stored);if(hash!==sha256)throw Error('Konflikt: Reservierte Storage-Bytes haben einen anderen SHA.');existing=true;uploaded=true}}
    if(!existing){
      assertScope();pauseBeforeUpload();batch?.onStage?.('UPLOAD');
      const {error}=await getClient().storage.from(model.storageBucket).upload(path,file,{contentType:info.mime,cacheControl:'0',upsert:false});
      if(error)throw error;
      uploaded=true;batch?.onUploaded?.(file.size);
    }
    const metadata={...row.metadata,upload:{...info,sha256}};if(batch)delete metadata.import_pending;
    const attached={...row,file_ref:null,storage_bucket:model.storageBucket,storage_path:path,metadata};
    assertScope();batch?.onStage?.('DB-VERKNÜPFUNG');
    if(batch)return await attachBatchAsset(attached,reserved.revision,batch.scope);
    return await commitAsset(attached,reserved?.revision??expectedRevision);
  }catch(error){
    const failure=new Error((reserved?'Metadaten-Entwurf gesichert; Bild nicht freigegeben. ':'Bisheriger Datensatz bleibt erhalten. ')+(error?.message||'Upload konnte nicht abgeschlossen werden.'));
    // The editor adopts a reserved draft, so retry updates this ID instead of inserting twice.
    // An uncommitted staged object stays private. No files are automatically removed.
    failure.assetDraft=reserved;failure.batchPaused=Boolean(error?.batchPaused);failure.code=error?.code;failure.status=error?.status||error?.statusCode;
    if(batch&&reserved?.metadata?.import_pending){failure.storagePending={asset_id:row.id,storage_bucket:model.storageBucket,storage_path:reserved.metadata.import_pending.storage_path,upload_confirmed:uploaded};failure.pauseBatch=true}
    throw failure;
  }
}
const hashAssetBytes=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
async function inspectAssetBytes(file){return {info:await globalThis.ASSET_LIBRARY_MODEL.inspectUpload(file),sha256:await hashAssetBytes(file)}}
const sameAssetSource=(a,b)=>['source_package','source_path'].every(k=>a.metadata?.[k]===b.metadata?.[k])&&String(a.metadata?.sha256||a.metadata?.upload?.sha256||'').toLowerCase()===String(b.metadata?.sha256||b.metadata?.upload?.sha256||'').toLowerCase();
const transientAssetError=e=>['40001','40P01','PGRST000','NETWORK_ERROR'].includes(e?.code)||[408,429].includes(Number(e?.status||e?.statusCode))||Number(e?.status||e?.statusCode)>=500||e instanceof TypeError||/failed to fetch|network error|timeout|ECONN/i.test(e?.message||'');
async function readAsset(id){
  requireAssetEditor();const {data,error}=await getClient().from('asset_library').select('*').eq('id',id).maybeSingle();if(error)throw error;return data;
}
async function downloadStaged(path){
  const {data,error}=await getClient().storage.from(globalThis.ASSET_LIBRARY_MODEL.storageBucket).download(path);
  if(error){if([400,404].includes(Number(error.status||error.statusCode))&&/not found|not exist/i.test(error.message||''))return null;throw error}
  return data;
}
async function attachBatchAsset(row,revision,scope){
  let failure;
  for(let attempt=0;attempt<3;attempt++){
    if(scope&&scope!==assetScope())throw Error('STOPP: Sitzung vor der DB-Verknüpfung gewechselt.');
    try{return await commitAsset(row,revision)}catch(error){
      failure=error;
      try{const live=await readAsset(row.id);if(live?.status==='draft'&&sameAssetSource(live,row)&&live.storage_bucket===row.storage_bucket&&live.storage_path===row.storage_path)return live}catch{}
      if(!transientAssetError(error)||attempt===2)break;
      await new Promise(r=>setTimeout(r,250*2**attempt));
    }
  }
  throw failure;
}
async function assetBatchPreflight(){
  requireAssetEditor();const scope=assetScope(),sb=getClient(),model=globalThis.ASSET_LIBRARY_MODEL;
  const {data:auth,error:authError}=await sb.auth.getUser();if(authError||auth?.user?.id!==state.user.id)throw Error('STOPP: Keine gültige authentifizierte Live-Sitzung.');
  const {data:role,error:roleError}=await sb.from('user_roles').select('role').eq('user_id',state.user.id).single();
  if(roleError||!CATALOG_WRITE_ROLES.has(role?.role)||role.role!==state.role)throw Error('STOPP: Live-Rolle fehlt oder wurde geändert.');
  const rows=await loadAssets({strict:true});
  if(!assetStorageReady||rows.some(r=>!Object.hasOwn(r,'storage_path')||!Object.hasOwn(r,'storage_bucket')))throw Error('STOPP: Storage-Migration nicht bestätigt.');
  if(!rows.some(r=>r.status!=='active'))throw Error('STOPP: Privater Draft-/Inactive-/Archivbestand konnte nicht positiv gelesen werden.');
  const {error}=await sb.storage.from(model.storageBucket).list('library',{limit:1});if(error)throw Error('STOPP: archive-assets ist nicht lesbar: '+error.message);
  // Hash legacy live image references locally; never write these read proofs back into metadata.
  const copies=rows.map(r=>({...r})),unverified=[],refs=new Map();let cursor=0;
  const targets=copies.filter(r=>![r.metadata?.upload?.sha256,r.metadata?.sha256].some(v=>/^[a-f0-9]{64}$/i.test(String(v||'')))&&(r.storage_path||r.file_ref&&/\.(png|jpe?g|webp)$/i.test(r.file_ref)));
  async function bytes(row){
    if(row.storage_path){if(row.storage_bucket!==model.storageBucket||!model.storagePathAllowed(row.id,row.storage_path))throw Error('Unsichere Storage-Referenz.');const {data,error}=await sb.storage.from(row.storage_bucket).download(row.storage_path);if(error)throw error;return data}
    if(!model.fileAllowed(row.file_ref))throw Error('Unsichere Legacy-Referenz.');
    const response=await fetch('./'+row.file_ref);if(!response.ok)throw Error('Legacy-Bild nicht lesbar.');return response.blob();
  }
  async function worker(){while(cursor<targets.length){const row=targets[cursor++],key=row.storage_path||row.file_ref;
    try{if(!refs.has(key))refs.set(key,bytes(row).then(async blob=>{if(blob.size>model.maxUploadBytes)throw Error('Legacy-Bild überschreitet Größenlimit.');return hashAssetBytes(blob)}));row.verified_sha256=await refs.get(key)}catch{unverified.push(row.id)}
  }}
  await Promise.all([worker(),worker()]);
  if(scope!==assetScope())throw Error('STOPP: Auth-Sitzung während des Preflights gewechselt.');
  return {rows:copies,scope,at:Date.now(),unverified_hashes:unverified,private_rows:rows.filter(r=>r.status!=='active').length};
}
function saveBatchAsset(input,revision,file,options){
  requireAssetEditor();if(!options?.sha256)throw Error('Batch benötigt den bestätigten Original-SHA.');
  return saveAsset(input,revision,file,options);
}
async function assetImageUrl(row,expectedType){
  const model=globalThis.ASSET_LIBRARY_MODEL;
  if(!row||row.asset_type!==expectedType)throw Error('Asset-Typ passt nicht zum Verwendungszweck.');
  const nextScope=[state.user?.id,state.role].join(':');
  if(imageScope!==nextScope){assetImageUrls.clear();imageScope=nextScope}
  if(!CATALOG_WRITE_ROLES.has(state.role)&&row.status!=='active')return null;
  if(row.file_ref)return model.fileAllowed(row.file_ref)?'./'+row.file_ref:null;
  if(!row.storage_path)return null;
  if(row.storage_bucket!==model.storageBucket||!model.storagePathAllowed(row.id,row.storage_path))throw Error('Ungültige Storage-Referenz.');
  const cacheKey=[row.id,row.revision,row.status,row.storage_path,expectedType].join('|'),cached=assetImageUrls.get(cacheKey);
  if(cached&&cached.expires>Date.now())return cached.promise;
  const promise=(async()=>{
    const {data,error}=await getClient().storage.from(row.storage_bucket).createSignedUrl(row.storage_path,model.signedUrlSeconds);
    if(error)throw error;
    if(!data?.signedUrl)throw Error('Storage-Vorschau nicht verfügbar.');
    return data.signedUrl;
  })();
  assetImageUrls.set(cacheKey,{promise,expires:Date.now()+45000});
  try{return await promise}catch(error){assetImageUrls.delete(cacheKey);throw error}
}
globalThis.JMA_ASSET_STORE=Object.freeze({load:loadAssets,save:saveAsset,imageUrl:assetImageUrl,catalogAsset,catalogImage,storageReady:()=>assetStorageReady,batchPreflight:assetBatchPreflight,saveBatch:saveBatchAsset,read:readAsset});

globalThis.JMA_CATALOG = {
  load: loadCatalog,
  create: createCatalogEntry,
  update: updateCatalogEntry,
  revision: catalogRevision,
  validate: validateCatalogEntry
};

globalThis.JMA_AUTH = {
  init,
  signUp,
  signInWithPassword,
  signOut,
  resetPasswordForEmail,
  updatePassword,
  finishRecovery,
  onRecovery,
  isRecovery,
  updateDisplayName,
  updateProfile,
  getAccount,
  getState,
  destroy
};
})();
