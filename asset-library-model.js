(()=>{
'use strict';
const types={avatar:'Avatar',frame:'Rahmen',banner:'Banner',ring:'Ring',wreath:'Kranz',trophy:'Trophäe',item:'Item',weapon:'Waffe',resource:'Ressource',deviation:'Abweichler',catalog:'Katalogbild',image:'Website-Bild'};
const statuses={draft:'Entwurf',active:'Aktiv',inactive:'Deaktiviert',archived:'Archiviert'};
const profileTypes=new Set(['avatar','frame','banner','ring','wreath','trophy']);
const storageBucket='archive-assets',maxUploadBytes=8*1024*1024,signedUrlSeconds=60;
const storagePathAllowed=(id,path)=>typeof path==='string'&&path.split('/')[1]===id&&/^library\/[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(path);
async function inspectUpload(file){
  if(!file||file.size<1||file.size>maxUploadBytes)throw Error('Bitte ein Bild bis 8 MiB auswählen.');
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const ascii=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
  const mime=bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)?'image/png':
    bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':
    ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'&&['VP8 ','VP8L','VP8X'].includes(ascii(12,16))?'image/webp':null;
  const extension=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[mime];
  const expectedExt=mime==='image/jpeg'?/\.jpe?g$/i:mime==='image/png'?/\.png$/i:/\.webp$/i;
  if(!mime||(file.type&&file.type!==mime)||!expectedExt.test(file.name))throw Error('Nur echte PNG-, JPG/JPEG- oder WebP-Bilder mit passendem Dateityp sind erlaubt.');
  let bitmap;try{bitmap=await createImageBitmap(file)}catch{throw Error('Das ausgewählte Bild ist beschädigt oder nicht lesbar.')}
  const {width,height}=bitmap;bitmap.close();
  if(width>8192||height>8192||width*height>32*1024*1024)throw Error('Bild zu groß: höchstens 8192 Pixel pro Seite und 32 Megapixel.');
  return {mime,extension,width,height,size:file.size,original_name:file.name};
}
const fileAllowed=value=>value===null||value===''||(typeof value==='string'&&value.length<=512&&/^assets\/.+\.(png|jpe?g|webp|svg)$/i.test(value)&&!value.includes('..')&&!/[\\\u0000-\u001f%?#"'<>:;]/.test(value));
function validate(input,pendingUpload=false){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Ungültiger Asset-Datensatz.');
  const row={};
  for(const key of ['id','name','asset_type','category','file_ref','catalog_id','status','sort_order','metadata'])row[key]=input[key];
  if(typeof row.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(row.id))throw Error('Ungültige Asset-ID.');
  if(typeof row.name!=='string'||!row.name.trim()||row.name.length>200)throw Error('Name benötigt 1 bis 200 Zeichen.');
  row.name=row.name.trim();
  if(!Object.hasOwn(types,row.asset_type)||!Object.hasOwn(statuses,row.status))throw Error('Ungültiger Typ oder Status.');
  if(typeof row.category!=='string'||row.category.length>80)throw Error('Kategorie darf höchstens 80 Zeichen enthalten.');
  if(!fileAllowed(row.file_ref))throw Error('Bildreferenz muss ein sicherer bestehender Pfad unter assets/ sein (PNG, JPG, WebP oder SVG).');
  row.file_ref=row.file_ref||null;row.catalog_id=row.catalog_id||null;
  row.storage_bucket=input.storage_bucket??null;row.storage_path=input.storage_path??null;
  if((row.storage_bucket===null)!==(row.storage_path===null)||
    (row.storage_bucket!==null&&(row.storage_bucket!==storageBucket||!storagePathAllowed(row.id,row.storage_path)||row.file_ref)))throw Error('Ungültige Storage-Referenz oder mehrere Bildquellen.');
  if(row.catalog_id!==null&&(typeof row.catalog_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(row.catalog_id)))throw Error('Ungültige Katalog-ID.');
  if(!Number.isInteger(row.sort_order)||Math.abs(row.sort_order)>100000)throw Error('Sortierung benötigt eine ganze Zahl zwischen -100000 und 100000.');
  if(!row.metadata||typeof row.metadata!=='object'||Array.isArray(row.metadata)||new TextEncoder().encode(JSON.stringify(row.metadata)).length>32768)throw Error('Metadaten müssen ein JSON-Objekt mit höchstens 32 KB sein.');
  if(row.status==='active'&&!row.file_ref&&!row.storage_path&&!pendingUpload&&!['ring','wreath','trophy'].includes(row.asset_type))throw Error('Aktive Bildassets benötigen eine Bildreferenz.');
  return structuredClone(row);
}
function inventory(){
  const rows=[];
  const add=(id,name,type,file,category,metadata,catalogId=null)=>{
    const ref=file?.replace(/^\.\//,'')||null,safe=fileAllowed(ref)?ref:null;
    const active=Boolean(safe)||['ring','wreath','trophy'].includes(type);
    rows.push({id,name,asset_type:type,category,file_ref:safe,catalog_id:catalogId,status:active?'active':'draft',users_available:active,sort_order:rows.length,metadata,revision:null,persisted:false});
  };
  for(const [group,type]of [['avatars','avatar'],['frames','frame'],['banners','banner']])for(const a of globalThis.PROFILE_ASSETS?.[group]||[])add(`profile:${type}:${a.id}`,a.name,type,a.src,'profile',{source:'profile-assets.js',legacy_id:a.id});
  const definitions=globalThis.JMA_PROFILE?.assetDefinitions?.()||{};
  for(const type of ['ring','wreath','trophy'])for(const a of definitions[type]||[])add(`profile:${type}:${a.id}`,a.name,type,null,'profile',{source:'routes-full.js',legacy_id:a.id,...a});
  for(const entry of globalThis.CATALOG_DATA?.entries||[]){
    const type=({items:'item',weapons:'weapon',resources:'resource',deviations:'deviation'})[entry.category]||'catalog';
    add(`catalog:${entry.id}`,entry.name_de,type,entry.image,entry.category,{source:'catalog_entries',kind:entry.kind||'',tags:entry.tags||[]},entry.id);
  }
  for(const [id,name,file]of [
    ['world-map','Once Human Weltkarte','assets/map/once-human-world-map.webp'],
    ['shattered-maiden','Shattered Maiden','assets/live-map/shattered-maiden.png'],
    ['butterfly-emissary','Butterfly Emissary','assets/live-map/butterfly-emissary.webp'],
    ['by-the-wind','By-the-Wind','assets/live-map/by-the-wind.png'],
    ['logo','Once Human Logo','assets/branding/once-human-logo.png']
  ])add(`website:${id}`,name,'image',file,'website',{source:'static-website'});
  for(const id of ['home-hero','feature-builds','feature-community','feature-database','feature-guides','feature-map','feature-tech','news-hero','news-mini-1','news-mini-2','news-mini-3','showcase-builds','showcase-items','showcase-weapons'])
    add(`website:reference:${id}`,id.replace(/-/g,' '),'image',`assets/reference/${id}.webp`,'website',{source:'static-website'});
  for(const id of ['energy-cell','sniper-rifle','tech-crate'])
    add(`website:techbank:${id}`,id.replace(/-/g,' '),'image',`assets/techbank/${id}.webp`,'techbank',{source:'routes-full.js'});
  return rows;
}
globalThis.ASSET_LIBRARY_MODEL=Object.freeze({types,statuses,profileTypes,fileAllowed,validate,inventory,storageBucket,storagePathAllowed,maxUploadBytes,signedUrlSeconds,inspectUpload});
})();
