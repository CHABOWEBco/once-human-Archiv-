// Local analysis and explicitly confirmed production batches in the existing ASSET_LIBRARY.
(()=>{
'use strict';
const model=globalThis.ASSET_LIBRARY_MODEL;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const labels={manifest:'Manifest / Review-Daten',folder:'Ordner',duplicate_hash:'Identischer SHA-256',filename_rule:'Dateinamensregel',manual:'Manuell',unresolved:'ZUORDNUNG PRÜFEN'};
const aliases={avatar:['avatar','avatars','profilbild','profilbilder','profile picture','profile pictures'],frame:['frame','frames','avatar frame','avatar frames','rahmen','profilrahmen'],banner:['banner','banners','profilbanner','profile banner'],ring:['ring','rings','ringe'],wreath:['wreath','wreaths','kranz','kranze','kraenze'],trophy:['trophy','trophies','trophae','trophaen'],item:['item','items','gegenstand','gegenstande'],weapon:['weapon','weapons','waffe','waffen'],resource:['resource','resources','ressource','ressourcen'],deviation:['deviation','deviations','deviant','deviants','abweichler'],catalog:['catalog','katalog','katalogbild'],image:['image','images','website image','website bild']};
const categoryAliases={profile:['profile','profil','profile cosmetics','profilkosmetik','cosmetics'],items:['items','item','gegenstande'],weapons:['weapons','weapon','waffen'],resources:['resources','resource','ressourcen'],deviations:['deviations','deviation','abweichler'],website:['website','webseite'],techbank:['techbank','techwerkbank']};
const defaults={avatar:'profile',frame:'profile',banner:'profile',ring:'profile',wreath:'profile',trophy:'profile',item:'items',weapon:'weapons',resource:'resources',deviation:'deviations',image:'website'};
const MiB=1024*1024,limits={archive:512*MiB,entries:10000,expanded:2*1024*MiB,directory:4*MiB,manifest:4*MiB,page:24};
const allowed=()=>['moderator','admin','owner'].includes(globalThis.JMA_AUTH?.getState?.().role);
const check=signal=>{if(signal?.aborted)throw new DOMException('Analyse abgebrochen.','AbortError')};
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
function safePath(path){
  if(typeof path!=='string'||!path||path.length>1024||/[\\:\u0000-\u001f\u007f\u2215\u2044\uff0f\uff3c]/.test(path)||path.startsWith('/'))return false;
  return path.split('/').every(p=>p&&p!=='.'&&p!=='..');
}
const systemPath=p=>p.split('/').some(s=>s.startsWith('.')||s==='__MACOSX');
const leaf=p=>p.split('/').pop();
const csvName=p=>/^OnceHuman_CMS_v2_(Manifest|Review_Queue)\.csv$/i.test(leaf(p));
const typeOf=value=>Object.entries(aliases).find(([id,words])=>id===norm(value)||words.includes(norm(value)))?.[0]||'';
function categoryOf(value,known){
  const raw=String(value??'').trim(),n=norm(raw);
  return Object.entries(categoryAliases).find(([id,words])=>id===n||words.includes(n))?.[0]||known.find(c=>norm(c)===n)||'';
}
// CRC is checked as well as decoded-image validity and SHA; corrupt ZIP members never become candidates.
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});
const crc=(bytes,start=0xffffffff)=>{let n=start;for(const byte of bytes)n=crcTable[(n^byte)&255]^(n>>>8);return n>>>0};
let zipLibrary;
function loadZipLibrary(){
  if(globalThis.fflate)return Promise.resolve(globalThis.fflate);
  if(!zipLibrary)zipLibrary=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='./vendor/fflate-0.8.2.min.js';
    script.onload=()=>resolve(globalThis.fflate);script.onerror=()=>{zipLibrary=null;script.remove();reject(Error('ZIP-Lesebibliothek nicht erreichbar.'))};document.head.append(script);
  });return zipLibrary;
}
async function bytesAt(file,start,length,signal){check(signal);const b=new Uint8Array(await file.slice(start,start+length).arrayBuffer());check(signal);if(b.length!==length)throw Error('ZIP ist abgeschnitten.');return b}
async function zipEntries(file,signal){
  if(file.size>limits.archive||file.size<22)throw Error('ZIP benötigt 22 Bytes bis höchstens 512 MiB.');
  const tail=await bytesAt(file,Math.max(0,file.size-65557),Math.min(file.size,65557),signal),dv=new DataView(tail.buffer);
  let end=-1;for(let i=tail.length-22;i>=0;i--)if(dv.getUint32(i,true)===0x06054b50&&i+22+dv.getUint16(i+20,true)===tail.length){end=i;break}
  if(end<0)throw Error('Keine vollständige ZIP-Zentralstruktur gefunden.');
  const count=dv.getUint16(end+10,true),size=dv.getUint32(end+12,true),offset=dv.getUint32(end+16,true),endOffset=file.size-tail.length+end;
  if(dv.getUint16(end+4,true)||dv.getUint16(end+6,true)||dv.getUint16(end+8,true)!==count||count===65535||offset===0xffffffff||size===0xffffffff)throw Error('Mehrteilige ZIPs und ZIP64 werden nicht unterstützt. Bitte normale ZIPs verwenden.');
  if(count>limits.entries||size>limits.directory||offset+size!==endOffset)throw Error('ZIP-Zentralstruktur oder Umfang ist ungültig.');
  const central=await bytesAt(file,offset,size,signal),view=new DataView(central.buffer),entries=[];let at=0,total=0;
  const cp437='ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
  const decode=(bytes,flags)=>flags&2048?new TextDecoder('utf-8',{fatal:true}).decode(bytes):Array.from(bytes,b=>b<128?String.fromCharCode(b):cp437[b-128]).join('');
  for(let i=0;i<count;i++){
    check(signal);if(at+46>size||view.getUint32(at,true)!==0x02014b50)throw Error('ZIP-Zentralstruktur ist beschädigt.');
    const flags=view.getUint16(at+8,true),method=view.getUint16(at+10,true),checksum=view.getUint32(at+16,true),compressed=view.getUint32(at+20,true),expanded=view.getUint32(at+24,true),nameSize=view.getUint16(at+28,true),extraSize=view.getUint16(at+30,true),commentSize=view.getUint16(at+32,true),local=view.getUint32(at+42,true),attrs=view.getUint32(at+38,true);
    const next=at+46+nameSize+extraSize+commentSize;if(next>size)throw Error('ZIP-Eintrag ist abgeschnitten.');
    const nameBytes=central.slice(at+46,at+46+nameSize);let path='',encodingError=false;try{path=decode(nameBytes,flags)}catch{path='[unlesbarer Pfad '+i+']';encodingError=true}
    let error=encodingError||!safePath(path.replace(/\/$/,''))?'Unsicherer oder unlesbarer Pfad.':systemPath(path)?'Versteckte Systemdatei.':(flags&1)?'Verschlüsselte ZIP-Datei.':((attrs>>>16)&0xf000)===0xa000?'Symbolischer Link.':![0,8].includes(method)?'Nicht unterstützte ZIP-Kompression.':'';
    if(view.getUint16(at+34,true)||expanded===0xffffffff||compressed===0xffffffff||local>=offset)error='ZIP64 / ungültiger Dateiverweis.';
    total+=expanded;if(total>limits.expanded)throw Error('ZIP überschreitet 2 GiB entpackten Gesamtumfang.');
    if(!path.endsWith('/')){
      const max=csvName(path)?limits.manifest:model.maxUploadBytes;
      if(expanded>max||compressed>max)error='Datei überschreitet '+(max/MiB)+' MiB.';
      // Each consumer owns its signal: analysis/preview pass one explicitly;
      // later production reads must never inherit the original analysis abort.
      entries.push({path,size:expanded,checksum,error,async read(readSignal){
        if(error)throw Error(error);check(readSignal);
        const header=await bytesAt(file,local,30,readSignal),h=new DataView(header.buffer);
        if(h.getUint32(0,true)!==0x04034b50||h.getUint16(6,true)!==flags||h.getUint16(8,true)!==method)throw Error('ZIP-Dateikopf stimmt nicht mit dem Verzeichnis überein.');
        const localName=await bytesAt(file,local+30,h.getUint16(26,true),readSignal);
        if(localName.length!==nameBytes.length||localName.some((b,j)=>b!==nameBytes[j]))throw Error('ZIP-Pfade stimmen nicht überein.');
        const dataOffset=local+30+localName.length+h.getUint16(28,true);
        if(dataOffset+compressed>offset)throw Error('ZIP-Datenbereich ist ungültig.');
        const input=await bytesAt(file,dataOffset,compressed,readSignal);
        let parts;
        if(method===0){if(input.length!==expanded||(crc(input)^0xffffffff)>>>0!==checksum)throw Error('ZIP-Größe / Prüfsumme stimmt nicht.');parts=[input]}
        else{
          const lib=await loadZipLibrary();check(readSignal);
          parts=await new Promise((resolve,reject)=>{
            let chunks=[],length=0,digest=0xffffffff,done=false,stream;
            const finish=(error)=>{if(done)return;done=true;clearTimeout(timeout);readSignal?.removeEventListener('abort',abort);stream?.terminate();error?reject(error):resolve(chunks);chunks=[]};
            const abort=()=>finish(new DOMException('Analyse abgebrochen.','AbortError'));
            const timeout=setTimeout(()=>finish(Error('ZIP-Datei benötigt zu lange zum Entpacken.')),15000);
            readSignal?.addEventListener('abort',abort,{once:true});
            try{
              stream=new lib.AsyncInflate((error,chunk,final)=>{
                if(done)return;if(error)return finish(Error('ZIP-Datei ist beschädigt.'));
                length+=chunk.length;if(length>expanded||length>max)return finish(Error('Entpackte Größe überschreitet die deklarierte Grenze.'));
                digest=crc(chunk,digest);chunks.push(chunk);
                if(final)finish(length!==expanded||((digest^0xffffffff)>>>0)!==checksum?Error('ZIP-Größe / Prüfsumme stimmt nicht.'):null);
              });
              // Small compressed chunks bound transient expansion in the library worker.
              if(!input.length)stream.push(input,true);
              for(let p=0;p<input.length;p+=1024)stream.push(input.slice(p,p+1024),p+1024>=input.length);
            }catch(error){finish(error)}
          });
        }
        check(readSignal);return new File(parts,leaf(path),{type:''});
      }});
    }
    at=next;if(i%100===0)await yieldUI();
  }
  if(at!==size)throw Error('ZIP enthält eine widersprüchliche Zentralstruktur.');
  return entries;
}
function parseCSV(text){
  text=text.replace(/^\ufeff/,'');const first=text.split(/\r?\n/,1)[0];
  const delimiter=[',',';','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const records=[];let record=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted||!cell)quoted=!quoted;else throw Error('Ungültige CSV-Anführungszeichen.')}
    else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){
      record.push(cell);cell='';if(c!==delimiter){if(record.some(v=>v.trim()))records.push(record);record=[];if(c==='\r'&&text[i+1]==='\n')i++}
    }else cell+=c;
  }
  if(quoted)throw Error('CSV enthält ein offenes Textfeld.');record.push(cell);if(record.some(v=>v.trim()))records.push(record);
  const header=(records.shift()||[]).map(norm);if(!header.length||new Set(header).size!==header.length)throw Error('CSV-Spalten fehlen oder sind doppelt.');
  return records.map(r=>{if(r.length!==header.length)throw Error('CSV-Zeile passt nicht zur Spaltenzahl.');return Object.fromEntries(header.map((k,i)=>[k,r[i].trim()]))});
}
const value=(row,keys)=>keys.map(k=>row[norm(k)]).find(v=>v!==undefined&&v!=='')||'';
function needsReview(row){
  if(['review','needs_review'].some(key=>['1','true','yes','ja'].includes(norm(value(row,[key])))))return true;
  return ['review','needs_review','review_status','status','classification_source','classification'].some(key=>{
    const n=norm(value(row,[key]));if(['false','0','no','nein','resolved','reviewed','approved','confirmed','verified','gepruft','zugeordnet','eindeutig'].includes(n))return false;
    return /review|unresolved|unklar|prufen|pruefen/.test(n);
  });
}
function manifestRecord(row,source){
  return {raw:row,source,path:value(row,['source_path','relative_path','relativer pfad','rel_path','path','zip_path','original_path','ursprünglicher pfad']),original:value(row,['original_name','original_filename','filename','file_name','ursprünglicher dateiname','dateiname']),package:value(row,['source_package','package','paket','package_name']),sha:value(row,['sha256','sha_256','hash','sha']).toLowerCase(),type:value(row,['asset_type','type','typ','existing_classification','klassifizierung','classification']),category:value(row,['category','kategorie','prepared_category','vorbereitete kategorie']),name:value(row,['name','display_name','anzeigename']),review:needsReview(row)};
}
const shaOf=r=>[r.verified_sha256,r.metadata?.upload?.sha256,r.metadata?.sha256].map(v=>String(v||'').toLowerCase()).find(v=>/^[a-f0-9]{64}$/.test(v))||'';
const uniqueClass=rows=>{const pairs=[...new Set(rows.filter(r=>r.asset_type&&r.category).map(r=>JSON.stringify([r.asset_type,r.category])))];return pairs.length===1?JSON.parse(pairs[0]):null};
function folderTypes(segment){
  const n=' '+norm(segment)+' ',matched=Object.entries(aliases).flatMap(([type,words])=>words.filter(word=>n.includes(' '+word+' ')).map(word=>({type,weight:word.split(' ').length})));
  const weight=Math.max(0,...matched.map(m=>m.weight));return [...new Set(matched.filter(m=>m.weight===weight).map(m=>m.type))];
}
function folderClass(path,known){
  const segments=path.split('/').slice(0,-1),categories=[...new Set(segments.map(s=>categoryOf(s,known)).filter(Boolean))];
  let types=[...new Set(segments.flatMap(folderTypes))];
  // "Images" is commonly just a file container, not a declared website purpose.
  const website=categories.includes('website')||segments.some(s=>/website (image|bild)/.test(norm(s)));
  if(types.includes('image')&&!website)types=types.filter(t=>t!=='image');
  return {type:types.length===1?types[0]:'',category:categories.length===1?categories[0]:types.length===1?defaults[types[0]]||'':'',conflict:types.length>1||categories.length>1};
}
function filenameClass(path){
  // Explicit purpose words only; a generic "image1" does not imply website use.
  const name=norm(leaf(path).replace(/\.[^.]+$/,'')).replace(/([a-z])([0-9])/g,'$1 $2'),types=folderTypes(name);
  if(types.length!==1||types[0]==='image'&&!/website (image|bild)/.test(name))return null;
  return {type:types[0],category:defaults[types[0]]||''};
}
async function classify(items,manifests,known,packages,warnings,signal,onProgress=()=>{}){
  const categories=[...new Set([...Object.keys(categoryAliases),...known.map(r=>r.category).filter(Boolean)])],names=new Map(),hashes=new Map(),paths=new Map();
  for(const item of items){const name=norm(item.original_name),list=names.get(name)||[];list.push(item);names.set(name,list);const pathsAt=paths.get(item.source_path)||[];pathsAt.push(item);paths.set(item.source_path,pathsAt);if(item.valid){const h=hashes.get(item.sha256)||[];h.push(item);hashes.set(item.sha256,h)}}
  const knownHashes=new Map();for(const row of known){const sha=shaOf(row);if(/^[a-f0-9]{64}$/.test(sha)){const list=knownHashes.get(sha)||[];list.push(row);knownHashes.set(sha,list)}}
  const knownNames=new Set(known.flatMap(r=>[norm(r.name),norm(r.metadata?.original_name||r.metadata?.upload?.original_name||r.name)]));
  const manifestPaths=new Map(),manifestNames=new Map();
  for(const m of manifests){if(m.package&&!packages.some(p=>p===m.package||p.replace(/\.zip$/i,'')===m.package.replace(/\.zip$/i,'')))continue;const map=m.path?manifestPaths:manifestNames,key=m.path||m.original,list=map.get(key)||[];list.push(m);map.set(key,list)}
  let processed=0;
  for(const item of items){
    if(processed++%50===0){check(signal);onProgress({stage:'Klassifizierung über alle geladenen Teile',done:processed-1,total:items.length});await yieldUI()}
    item.manifest=null;item.manifest_category='';item.review=false;
    item.name_duplicate=names.get(norm(item.original_name)).length>1||knownNames.has(norm(item.original_name))||knownNames.has(norm(item.name));
    if(!item.valid)continue;
    const existing=knownHashes.get(item.sha256)||[];
    // An image-less reservation is a resume candidate, never proof of completed import.
    const linked=existing.filter(hasImage);
    item.exact_duplicate=hashes.get(item.sha256).length>1;item.known_ids=linked.map(r=>r.id);
    item.already_imported=linked.some(r=>r.persisted!==false&&r.metadata?.source_package===item.source_package&&r.metadata?.source_path===item.source_path);
    item.path_duplicate=paths.get(item.source_path).length>1;
    const matching=[...(manifestPaths.get(item.source_path)||[]),...(names.get(norm(item.original_name)).length===1?manifestNames.get(item.original_name)||[]:[])];
    const verified=matching.filter(m=>{if(m.sha&&(!/^[a-f0-9]{64}$/.test(m.sha)||m.sha!==item.sha256)){item.notes.push('Manifest-Hash passt nicht zum Originalbild.');return false}if(m.original&&m.original!==item.original_name){item.notes.push('Manifest-Dateiname passt nicht.');return false}return true});
    let type='',category='',source='unresolved',reason='',locked=false;
    if(item.manualClassification){({type,category}=item.manualClassification);source='manual';reason='Vom Admin im lokalen Dry Run bestätigt.'}
    if(verified.length&&!item.manualClassification){
      item.manifest_category=verified[0].category;
      const prepared=verified.map(m=>{const t=m.type?typeOf(m.type):typeOf(m.category);return {m,type:t,category:categoryOf(m.category,categories)||(typeOf(m.category)?defaults[t]||'':'')}});
      for(const p of prepared){
        if(!p.category&&!p.m.category&&p.type)p.category=defaults[p.type]||'';
        if(!p.type&&!p.m.type&&p.category&&!p.m.review){const folder=folderClass(item.source_path,categories);if(!folder.conflict&&folder.type)p.type=folder.type}
      }
      const complete=prepared.filter(p=>p.type&&p.category&&!p.m.review),pairs=[...new Set(complete.map(p=>JSON.stringify([p.type,p.category])))];
      if(pairs.length===1){[type,category]=JSON.parse(pairs[0]);source='manifest';reason='Passende vorbereitete Metadaten: '+complete.map(p=>p.m.source).join(', ');item.manifest=complete[0].m.raw;const proposed=complete[0].m.name;if(proposed&&proposed.length<=200)item.name=proposed}
      else if(pairs.length>1){locked=true;reason='Widersprüchliche Manifest-/Review-Zuordnungen.'}
      else{
        locked=true;type=prepared.find(p=>p.type)?.type||'';category=prepared.find(p=>p.category)?.category||'';
        reason='Vorbereitete Metadaten benötigen eine bestätigte Typ-/Kategoriezuordnung.';item.manifest=verified[0].raw;item.classificationLocked=true;
      }
    }
    if(!source||source==='unresolved'){
      if(!locked){const folder=folderClass(item.source_path,categories);if(folder.conflict){locked=true;reason='Widersprüchliche Ordnerzuordnung.'}else if(folder.type&&folder.category){type=folder.type;category=folder.category;source='folder';reason='Eindeutiger Ordnerpfad: '+item.source_path}}
      if(!locked&&source==='unresolved'){
        const pair=uniqueClass(existing);if(pair&&Object.hasOwn(model.types,pair[0])&&categoryOf(pair[1],categories)){[type,category]=pair;source='duplicate_hash';reason='Klassifizierung identischer gespeicherter Bildbytes: '+item.known_ids.join(', ')}
        else if(existing.length){locked=true;reason='Identisches Bild hat mehrere Verwendungen oder keine eindeutige Kategorie.'}
      }
      if(!locked&&source==='unresolved'){const match=filenameClass(item.source_path);if(match?.type&&match.category){type=match.type;category=match.category;source='filename_rule';reason='Explizites Typ-Schlüsselwort im Dateinamen.'}}
    }
    item.classificationLocked=locked;item.asset_type=type;item.category=category;item.classification_source=source;
    item.review=source==='unresolved'||!type||!category;
    item.reason=reason||'Keine zuverlässige Typ-/Kategoriezuordnung.';
    if(item.path_duplicate)item.notes.push('Gleicher Originalpfad mit unterschiedlichen Bildbytes; getrennte Kandidaten, keine Überschreibung.');
    if(item.review&&item.manifest_category&&!categoryOf(item.manifest_category,categories)&&!typeOf(item.manifest_category))item.notes.push('Unbekannte Manifest-Kategorie: '+item.manifest_category);
  }
  // A higher-priority manifest/folder/manual classification beats lower filename rules.
  for(const group of hashes.values()){
    const trusted=group.filter(i=>!i.review),higher=trusted.filter(i=>i.classification_source!=='filename_rule'),pair=uniqueClass(higher.length?higher:trusted);
    for(const item of group)if(['unresolved','filename_rule'].includes(item.classification_source)&&!item.classificationLocked&&pair&&group.length>1){
      if(item.classification_source==='filename_rule'&&higher.length===0)continue;
      [item.asset_type,item.category]=pair;item.classification_source='duplicate_hash';item.reason='Eindeutige Klassifizierung identischer Originalbytes in diesem Batch.';item.review=false;
    }
  }
  selectRepresentatives(items);
  const displayNames=new Map();for(const item of items){const key=norm(item.name);displayNames.set(key,(displayNames.get(key)||0)+1)}
  for(const item of items)if(displayNames.get(norm(item.name))>1||knownNames.has(norm(item.name)))item.name_duplicate=true;
  check(signal);
  const itemPaths=new Set(items.map(i=>i.source_path)),itemNames=new Set(items.map(i=>i.original_name));
  for(const m of manifests)if(!(m.path?itemPaths.has(m.path):itemNames.has(m.original)))warnings.push(m.source+': Metadaten ohne passende Datei: '+(m.path||m.original||'(Pfad fehlt)'));
}
// One selection policy for analysis, part additions and local admin overrides.
const comparePath=(a,b)=>a.source_path<b.source_path?-1:a.source_path>b.source_path?1:0;
const complete=i=>i.valid&&!i.review&&Object.hasOwn(model.types,i.asset_type)&&Boolean(i.category);
function selectRepresentatives(items){
  const hashes=new Map();
  for(const item of items){
    item.include=false;item.representative_id=null;item.representative_path=null;item.duplicate_state='';item.duplicate_sources=[];item.selection_reason='';item.candidate_error='';
    if(item.valid){const group=hashes.get(item.sha256)||[];group.push(item);hashes.set(item.sha256,group)}
  }
  for(const group of hashes.values()){
    const ordered=[...group].sort(comparePath),duplicate=group.length>1,known=group.some(i=>i.known_ids.length);
    const sources=duplicate?ordered.map(i=>({source_path:i.source_path,original_name:i.original_name,...(i.manifest?.['original category v2']?{original_category:i.manifest['original category v2']}:{})})):[];
    const eligible=ordered.filter(i=>complete(i)&&!i.path_duplicate);
    const ranked=[...eligible].sort((a,b)=>Number(b.classification_source==='manifest')-Number(a.classification_source==='manifest')||comparePath(a,b));
    // Explicit local decisions survive reclassification; a skipped representative yields to the next eligible member.
    const manual=ordered.filter(i=>complete(i)&&i.includeOverride===true),automatic=known||manual.length?null:ranked.find(i=>i.includeOverride!==false);
    for(const item of group){
      item.duplicate_sources=sources;
      if(complete(item))item.include=item.includeOverride===true||item===automatic;
      if(item.include){try{candidate(item)}catch(error){item.include=false;item.candidate_error=error.message}}
    }
    const selected=ordered.filter(i=>i.include).sort((a,b)=>Number(b.classification_source==='manifest')-Number(a.classification_source==='manifest')||comparePath(a,b)),representative=selected[0]||null;
    const state=known?'existing':representative?'representative':group.every(i=>!complete(i))?'review':'unselected';
    const reason=known?'Identische Bildbytes bereits in asset_library vorhanden.':representative?'Genau ein Standardrepräsentant; weitere Vormerkungen nur durch manuelle Entscheidung.':group.every(i=>!complete(i))?'Alle Gruppenmitglieder benötigen eine bestätigte Zuordnung.':group.some(i=>i.candidate_error)?'Kandidat verletzt die bestehende Metadatenvalidierung.':eligible.length?'Alle geeigneten Gruppenmitglieder wurden manuell übersprungen.':'Gleiche Quellpfade mit unterschiedlichen Bytes müssen zuerst geprüft werden.';
    for(const item of group){
      item.representative_id=representative?.id||null;item.representative_path=representative?.source_path||null;
      item.duplicate_state=known?'existing':duplicate?(state==='representative'?(item===representative?'representative':'covered'):state):'';
      item.selection_reason=reason;
    }
  }
}
async function analyze({files,known=[],sourcePackage='',previous=null,signal,onProgress=()=>{}}){
  if(!allowed())throw Error('Bestehende Moderator-/Admin-/Owner-Rolle erforderlich.');
  check(signal);if(!files?.length)throw Error('Bitte ZIP, Ordner oder Bilder auswählen.');
  if(previous&&sourcePackage!==previous.sourcePackage)throw Error('Paketname während einer gemeinsamen Sitzung nicht ändern.');
  if(!sourcePackage||sourcePackage.length>200||/[\u0000-\u001f]/.test(sourcePackage))throw Error('Gemeinsamen Paketnamen mit 1 bis 200 Zeichen angeben.');
  const entries=[],packages=[sourcePackage],warnings=(previous?.warnings||[]).filter(w=>!w.includes(': Metadaten ohne passende Datei:')),metadataSources=[...(previous?.metadataSources||[])],manifests=[...(previous?.manifests||[])];
  for(const file of files){
    check(signal);if(/\.zip$/i.test(file.name)){
      onProgress({stage:'ZIP-Verzeichnis lesen',done:0,total:files.length});
      const pack=await zipEntries(file,signal);entries.push(...pack.map(e=>({...e,package:sourcePackage})));
    }else{const path=file.webkitRelativePath||file.name;entries.push({path,size:file.size,package:sourcePackage,error:!safePath(path)?'Unsicherer Pfad.':systemPath(path)?'Versteckte Systemdatei.':'',read:async()=>file})}
  }
  if(entries.length>limits.entries)throw Error('Höchstens 10.000 Dateien pro Analyse.');
  const invalidMetadata=[...(previous?.invalidMetadata||[])];
  for(const entry of entries.filter(e=>csvName(e.path))){
    check(signal);let key=entry.path+':'+entry.size+':'+(entry.checksum??'unreadable');
    try{
      if(entry.error)throw Error(entry.error);if(entry.size>limits.manifest)throw Error('CSV überschreitet 4 MiB.');
      const file=await entry.read(signal),text=await file.text();check(signal);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');key=entry.path+':'+digest;
      if(metadataSources.includes(key))continue;
      const parsed=parseCSV(text);if(parsed.some(row=>new TextEncoder().encode(JSON.stringify(row)).length>16384))throw Error('CSV-Zeile überschreitet 16 KiB Metadaten.');
      manifests.push(...parsed.map(row=>manifestRecord(row,entry.path)));metadataSources.push(key);
    }catch(error){check(signal);if(!metadataSources.includes(key))metadataSources.push(key);if(!invalidMetadata.includes(key))invalidMetadata.push(key);warnings.push(entry.path+': '+error.message)}
  }
  const imageEntries=entries.filter(e=>!csvName(e.path)),items=new Array(imageEntries.length);let cursor=0,done=0;
  async function worker(){
    while(cursor<imageEntries.length){
      check(signal);const index=cursor++,entry=imageEntries[index];
      const item={id:'asset-'+crypto.randomUUID(),name:leaf(entry.path).replace(/\.[^.]*$/,'').trim().slice(0,200)||'Ohne Namen',original_name:leaf(entry.path),source_path:entry.path,source_package:entry.package,size:entry.size,archive_checksum:entry.checksum,status:'draft',valid:false,notes:[],known_ids:[],classification_source:'unresolved',review:false,include:false,read:entry.read};
      try{
        if(entry.error)throw Error(entry.error);if(!/\.(png|jpe?g|webp)$/i.test(item.original_name))throw Error('Nicht unterstützte Datei.');
        const file=await entry.read(signal);check(signal);
        const info=await model.inspectUpload(file);check(signal);Object.assign(item,info);item.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');check(signal);item.valid=true;
      }catch(error){check(signal);item.error=error.message}
      items[index]=item;done++;onProgress({stage:'Bilder validieren und SHA-256 bestimmen',done,total:imageEntries.length});await yieldUI();
    }
  }
  // Two Files/decoders/inflate workers at most, regardless of archive length.
  await Promise.all([worker(),worker()]);check(signal);
  const merged=[...(previous?.items||[])],identities=new Set(merged.map(identity));let repeated=previous?.repeatedEntries||0;
  for(const item of items){const key=identity(item);if(identities.has(key)){repeated++;continue}identities.add(key);merged.push(item)}
  if(merged.length+metadataSources.length>limits.entries)throw Error('Gemeinsames Paket überschreitet 10.000 Dateien.');
  // Copy previous items before reclassification so an aborted addition cannot change the old session.
  const combined=merged.map(i=>({...i,notes:[],manifest:null}));await classify(combined,manifests,known,packages,warnings,signal,onProgress);check(signal);
  return {items:combined,packages,sourcePackage,loadedParts:[...new Set([...(previous?.loadedParts||[]),...files.map(f=>f.name)])],repeatedEntries:repeated,invalidMetadata,warnings:[...new Set(warnings)],metadataSources,manifests,metadataFiles:metadataSources.length,totalFiles:combined.length+metadataSources.length,knownCount:known.length,knownHashCount:known.filter(r=>/^[a-f0-9]{64}$/.test(shaOf(r))).length};
}
function identity(item){return JSON.stringify([item.source_package,item.source_path,item.valid?item.sha256:[item.size,item.error,item.archive_checksum]])}
function candidate(item){
  return model.validate({id:item.id,name:item.name,asset_type:item.asset_type,category:item.category,file_ref:null,catalog_id:null,status:'draft',sort_order:0,metadata:{source_package:item.source_package,source_path:item.source_path,original_name:item.original_name,sha256:item.sha256,classification_source:item.classification_source,classification_reason:item.reason,...(item.manifest?{source_manifest:item.manifest}:{}),...(item.duplicate_sources?.length?{duplicate_sources:item.duplicate_sources}:{})}});
}
function report(result){
  const valid=result.items.filter(i=>i.valid),sources=Object.fromEntries(Object.keys(labels).map(k=>[k,valid.filter(i=>i.classification_source===k).length])),byType=Object.create(null),byCategory=Object.create(null),formats={png:0,jpg:0,webp:0},groups=new Map();
  for(const item of valid){byType[item.asset_type||'unresolved']=(byType[item.asset_type||'unresolved']||0)+1;byCategory[item.category||'unresolved']=(byCategory[item.category||'unresolved']||0)+1;formats[item.extension]++;if(item.exact_duplicate){const members=groups.get(item.sha256)||[];members.push(item);groups.set(item.sha256,members)}}
  return {mode:'DRY RUN',production_writes:0,packages:result.packages,loaded_parts:result.loadedParts,repeated_entries_not_counted:result.repeatedEntries,total_files:result.totalFiles,metadata_files:result.metadataFiles,valid_images:valid.length,invalid_files:result.items.length-valid.length+(result.invalidMetadata?.length||0),invalid_metadata_files:result.invalidMetadata?.length||0,formats,automatically_classified:valid.filter(i=>!i.review&&i.classification_source!=='manual').length,classification_sources:sources,review:valid.filter(i=>i.review).length,name_duplicates:result.items.filter(i=>i.name_duplicate).length,exact_duplicate_files:valid.filter(i=>i.exact_duplicate).length,exact_duplicate_groups:groups.size,duplicate_groups_with_new_representative:[...groups.values()].filter(g=>!g.some(i=>i.known_ids.length)&&g.some(i=>i.include)).length,duplicate_groups_already_present:[...groups.values()].filter(g=>g.some(i=>i.known_ids.length)).length,duplicate_groups_review:[...groups.values()].filter(g=>!g.some(i=>i.known_ids.length)&&g.every(i=>!complete(i))).length,duplicate_groups_without_representative:[...groups.values()].filter(g=>!g.some(i=>i.known_ids.length)&&g.some(complete)&&!g.some(i=>i.include)).map(g=>({sha256:g[0].sha256,reason:g[0].selection_reason,source_paths:g.map(i=>i.source_path).sort()})),skipped_redundant_copies:[...groups.values()].reduce((n,g)=>n+(g.some(i=>i.known_ids.length)||g.some(i=>i.include)?g.filter(i=>!i.include).length:0),0),selected_unique_image_contents:new Set(valid.filter(i=>i.include&&!i.review).map(i=>i.sha256)).size,duplicate_groups_multiple_selected:[...groups.values()].filter(g=>g.filter(i=>i.include).length>1).length,known_images:valid.filter(i=>i.known_ids.length).length,already_imported:valid.filter(i=>i.already_imported).length,path_conflicts:valid.filter(i=>i.path_duplicate).length,unknown_categories:[...new Set(valid.filter(i=>i.review&&i.manifest_category&&!i.category).map(i=>i.manifest_category))],selected_candidates:valid.filter(i=>i.include&&!i.review).length,skipped_candidates:valid.filter(i=>!i.include||i.review).length,by_type:byType,by_category:byCategory,known_assets:result.knownCount,known_assets_with_sha256:result.knownHashCount,warnings:result.warnings};
}
// Explicit production package approvals; no general enablement of arbitrary ZIPs.
const productionPackages=Object.freeze({
  'OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip':Object.freeze({label:'Cosmetic-Pilot',maxCandidates:1083,reportMode:'COSMETIC PRODUCTION BATCH'}),
  'OnceHuman_CMS_v2_02_Database_Combat.zip':Object.freeze({label:'Database / Combat',maxCandidates:null,reportMode:'DATABASE COMBAT PRODUCTION BATCH'}),
  'OnceHuman_CMS_v2_03_Database_World_Items.zip':Object.freeze({label:'Database / World Items',maxCandidates:null,reportMode:'DATABASE WORLD ITEMS PRODUCTION BATCH'}),
  'OnceHuman_CMS_v2_04_Building_Formulas.zip':Object.freeze({label:'Building / Formulas',maxCandidates:null,reportMode:'BUILDING FORMULAS PRODUCTION BATCH'})
});
const liveSha=shaOf;
const sameSource=(row,item)=>row.metadata?.source_package===item.source_package&&row.metadata?.source_path===item.source_path&&liveSha(row)===item.sha256;
const hasImage=row=>Boolean(row.file_ref&&model.fileAllowed(row.file_ref)||row.storage_bucket===model.storageBucket&&model.storagePathAllowed(row.id,row.storage_path));
function buildBatchPlan(analysis,live,dryRunCount=report(analysis).selected_unique_image_contents){
  if(!Object.hasOwn(productionPackages,analysis.sourcePackage))throw Error('STOPP: Produktionsbatch ist nur für Cosmetic-Pilot, Database / Combat, Database / World Items und Building / Formulas freigegeben.');
  const approval=productionPackages[analysis.sourcePackage];
  if(!Number.isSafeInteger(dryRunCount)||dryRunCount<0)throw Error('STOPP: Bestätigte lokale Dry-Run-Menge fehlt.');
  const originals=analysis.items.filter(i=>i.valid),held=i=>analysis.manifests.some(m=>m.review&&(!m.sha||m.sha===i.sha256)&&(m.path===i.source_path||!m.path&&m.original===i.original_name));
  if(originals.some(i=>i.source_package!==analysis.sourcePackage))throw Error('STOPP: Quelldatei gehört nicht zum aktuellen Paket.');
  const jobs=[],hashes=new Set();
  for(const item of originals){
    if(item.include!==true||item.review!==false||!complete(item)||held(item)||item.duplicate_state==='covered'||item.exact_duplicate&&item.representative_id!==item.id)continue;
    const input=candidate(item);let state='WARTET',kind='new',reason='',row=null;
    if(hashes.has(item.sha256))throw Error('STOPP: Mehrere Produktivrepräsentanten desselben SHA.');hashes.add(item.sha256);
    const source=live.filter(r=>r.metadata?.source_package===item.source_package&&r.metadata?.source_path===item.source_path),exact=source.filter(r=>liveSha(r)===item.sha256),same=live.filter(r=>liveSha(r)===item.sha256);
    if(source.some(r=>liveSha(r)!==item.sha256)||exact.length>1){state='KONFLIKT';reason='Quellpfad mit anderem/fehlendem SHA oder mehreren passenden Datensätzen.'}
    else if(same.some(hasImage)){state='BEREITS VORHANDEN';kind='existing';row=same.find(hasImage);reason='Identische Bildbytes mit vorhandener Bildreferenz.'}
    else if(exact.length===1){
      row=exact[0];if(row.status==='draft'&&!row.storage_path&&!row.file_ref&&row.asset_type===item.asset_type&&row.category===item.category&&Number.isInteger(row.revision)){kind='resume'}
      else{state='KONFLIKT';reason='Passender Datensatz ist kein kompatibler reservierter Draft.'}
    }else if(same.length){state='KONFLIKT';reason='Identischer SHA ist unter anderer Herkunft ohne vollständige Bildreferenz reserviert.'}
    jobs.push({item,input,row,kind,status:state,error:reason,storage_pending:null,uploaded_bytes:0,verified:false});
  }
  const pending=jobs.filter(j=>j.status==='WARTET');
  if(approval.maxCandidates!==null&&pending.length>approval.maxCandidates)throw Error('STOPP: Live-Preflight ergibt '+pending.length+' Kandidaten; maximal '+approval.maxCandidates.toLocaleString('de-DE')+' sind für '+approval.label+' freigegeben.');
  if(pending.length>dryRunCount)throw Error('STOPP: Live-Menge '+pending.length+' überschreitet die bestätigte lokale Dry-Run-Menge '+dryRunCount+'.');
  return {jobs,source_package:analysis.sourcePackage,package_label:approval.label,report_mode:approval.reportMode,dry_run_limit:dryRunCount,original_planned:report(analysis).selected_candidates,confirmed_pilot_limit:approval.maxCandidates,remaining:pending.length,new_candidates:pending.filter(j=>j.kind==='new').length,resumable_drafts:pending.filter(j=>j.kind==='resume').length,already_present:jobs.filter(j=>j.kind==='existing').length,conflicts:jobs.filter(j=>j.status==='KONFLIKT').length,review_excluded:originals.filter(i=>i.review||held(i)).length,redundant_duplicates_excluded:originals.filter(i=>i.duplicate_state==='covered').length,total_bytes:pending.reduce((n,j)=>n+j.item.size,0)};
}
function createProductionBatch(analysis,proof,onChange=()=>{},dryRunCount=report(analysis).selected_unique_image_contents){
  const plan=buildBatchPlan(analysis,proof.rows,dryRunCount),store=globalThis.JMA_ASSET_STORE,id='batch-'+crypto.randomUUID();
  const batch={id,plan,phase:'BEREIT',active:0,running:false,starting:false,pause:false,started:false,confirmed:false,confirmation:'',uploaded_bytes:0,last_live_remaining:plan.remaining,verification_error:'',new_active_assets:null,proof};
  const changed=()=>onChange(batch),scope=()=>{const a=globalThis.JMA_AUTH.getState();return [a.user?.id,a.role].join(':')};
  async function jobRun(job){
    batch.active++;job.status='VALIDIERUNG';job.error='';changed();
    try{
      if(scope()!==proof.scope)throw Error('STOPP: Sitzung gewechselt.');
      const target=job.row?.id||job.input.id,live=await store.read(target);
      if(live){
        if(!sameSource(live,job.item)||live.asset_type!==job.input.asset_type||live.category!==job.input.category)throw Error('KONFLIKT: Live-Datensatz wurde zwischenzeitlich verändert.');
        if(hasImage(live)){job.status='BEREITS VORHANDEN';job.row=live;changed();return}
        if(live.status!=='draft')throw Error('KONFLIKT: Nur reservierte Drafts dürfen fortgesetzt werden.');job.row=live;job.kind='resume';
      }
      const file=await job.item.read();
      const previous=job.row?.metadata||{},sources=[...(previous.duplicate_sources||[]),...(job.input.metadata.duplicate_sources||[])];
      const input={...job.input,id:job.row?.id||job.input.id,name:job.row?.name||job.input.name,sort_order:job.row?.sort_order??job.input.sort_order,catalog_id:job.row?.catalog_id??job.input.catalog_id,metadata:{...previous,...job.input.metadata,import_batch:id,...(sources.length?{duplicate_sources:[...new Map(sources.map(s=>[s.source_path,s])).values()]}:{})}};
      const saved=await store.saveBatch(input,job.row?.revision??null,file,{sha256:job.item.sha256,scope:proof.scope,shouldPause:()=>batch.pause,onStage:status=>{job.status=status;changed()},onUploaded:bytes=>{job.uploaded_bytes+=bytes;batch.uploaded_bytes+=bytes;changed()}});
      job.row=saved;job.status=job.kind==='resume'?'FORTGESETZT':'ERFOLGREICH';
    }catch(error){
      if(error.assetDraft)job.row=error.assetDraft;job.storage_pending=error.storagePending||null;
      job.status=error.batchPaused?'WARTET':/konflikt/i.test(String(error.message))?'KONFLIKT':'FEHLER';job.error=error.message;
      if(error.batchPaused||error.pauseBatch||[401,403].includes(Number(error.status||error.statusCode))||['42501','PGRST301'].includes(error.code)||/row-level security|permission denied|JWT|Sitzung/i.test(error.message)||scope()!==proof.scope){batch.pause=true;batch.phase='PAUSIERT'}
    }finally{batch.active--;changed()}
  }
  async function verify(){
    const rows=await store.load({strict:true}),byId=new Map(rows.map(r=>[r.id,r]));
    if(scope()!==proof.scope)throw Error('STOPP: Verifikation gehört zu einer anderen Sitzung.');
    for(const job of plan.jobs.filter(j=>['ERFOLGREICH','FORTGESETZT'].includes(j.status))){
      const row=byId.get(job.row.id),sources=job.input.metadata.duplicate_sources||[];
      job.verified=Boolean(row&&row.status==='draft'&&row.storage_bucket===model.storageBucket&&model.storagePathAllowed(row.id,row.storage_path)&&row.storage_path===job.row.storage_path&&sameSource(row,job.item)&&row.metadata?.upload?.sha256===job.item.sha256&&row.metadata?.original_name===job.item.original_name&&row.metadata?.import_batch===id&&row.users_available===false&&row.metadata?.classification_source===job.input.metadata.classification_source&&row.metadata?.classification_reason===job.input.metadata.classification_reason&&sources.every(s=>row.metadata.duplicate_sources?.some(x=>x.source_path===s.source_path&&x.original_name===s.original_name)));
      if(!job.verified){job.status='FEHLER';job.error='STOPP: Live-Verifikation von Draft, Storage oder Source-Metadaten fehlgeschlagen.';batch.pause=true}
    }
    batch.new_active_assets=rows.filter(r=>r.metadata?.import_batch===id&&r.status==='active').length;
    if(batch.new_active_assets)throw Error('STOPP: Live-Verifikation findet aktive Assets mit dieser Batch-ID.');
  }
  batch.verify=verify;
  batch.requestPause=()=>{batch.pause=true;batch.phase='PAUSE ANGEFORDERT';changed()};
  batch.stop=()=>{batch.confirmed=false;batch.requestPause()};
  batch.retry=jobId=>{if(batch.running||batch.active)throw Error('Zuerst laufende Uploads beenden.');const j=plan.jobs.find(j=>j.item.id===jobId);if(j?.status==='FEHLER'){j.status='WARTET';j.error='';batch.pause=true;batch.phase='PAUSIERT';changed()}};
  batch.run=async confirmation=>{
    if(batch.running||batch.starting)return;
    if(!batch.confirmed){if(confirmation!=='IMPORT '+plan.remaining+' DRAFT-ASSETS')throw Error('Exakte Importbestätigung fehlt.');batch.confirmed=true}
    if(scope()!==proof.scope)throw Error('STOPP: Sitzung gewechselt.');
    // Reconcile the fixed approved set again before each start/resume; never add later Review/selection changes.
    batch.starting=true;batch.pause=false;changed();let current,fresh,map;
    try{current=await store.batchPreflight();fresh=buildBatchPlan(analysis,current.rows,plan.dry_run_limit);map=new Map(fresh.jobs.map(j=>[j.item.id,j]))}finally{batch.starting=false}
    if(batch.pause){batch.phase='PAUSIERT';changed();return}
    if(fresh.source_package!==plan.source_package)throw Error('STOPP: Bestätigtes Paket wurde verändert.');
    if(fresh.remaining>plan.remaining)throw Error('STOPP: Live-Menge ist nach der Bestätigung gewachsen.');
    for(const j of plan.jobs.filter(j=>j.status==='WARTET')){
      const next=map.get(j.item.id);if(!next)throw Error('STOPP: Bestätigte Auswahl wurde verändert.');Object.assign(j,{row:next.row,kind:next.kind,status:next.status,error:next.error});
    }
    batch.last_live_remaining=fresh.remaining;
    batch.pause=false;batch.running=true;batch.started=true;batch.phase='LÄUFT';batch.verification_error='';changed();
    let cursor=0;const waiting=plan.jobs.filter(j=>j.status==='WARTET');
    const worker=async()=>{while(!batch.pause&&cursor<waiting.length){await jobRun(waiting[cursor++])}};
    try{await Promise.all([worker(),worker()]);try{await verify()}catch(error){batch.verification_error=error.message;batch.pause=true}}
    finally{batch.running=false;batch.phase=batch.pause?'PAUSIERT':'ABGESCHLOSSEN';changed()}
  };
  batch.report=()=>({mode:plan.report_mode,source_package:plan.source_package,batch_id:id,originally_planned:plan.original_planned,confirmed_dry_run_limit:plan.dry_run_limit,confirmed_pilot_limit:plan.confirmed_pilot_limit,after_live_preflight:plan.remaining,after_latest_live_recheck:batch.last_live_remaining,planned_total_bytes:plan.total_bytes,new_imported:plan.jobs.filter(j=>j.kind==='new'&&j.verified).length,resumed_drafts:plan.jobs.filter(j=>j.kind==='resume'&&j.verified).length,already_fully_present:plan.jobs.filter(j=>j.status==='BEREITS VORHANDEN').length,redundant_duplicates:plan.redundant_duplicates_excluded,review_untouched:plan.review_excluded,conflicts:plan.jobs.filter(j=>j.status==='KONFLIKT').length,errors:plan.jobs.filter(j=>j.status==='FEHLER').length,verified_assets:plan.jobs.filter(j=>j.verified).length,uploaded_total_bytes:batch.uploaded_bytes,active_upload_bytes:plan.jobs.filter(j=>j.status==='UPLOAD').reduce((n,j)=>n+j.item.size,0),new_active_assets:batch.new_active_assets,storage_attachment_open:plan.jobs.filter(j=>j.storage_pending&&!j.verified).map(j=>({...j.storage_pending,error:j.error})),verification_error:batch.verification_error,phase:batch.phase,items:plan.jobs.map(j=>({source_path:j.item.source_path,sha256:j.item.sha256,id:j.row?.id||j.input.id,status:j.status,kind:j.kind,error:j.error,verified:j.verified,uploaded_bytes:j.uploaded_bytes,storage_pending:j.storage_pending}))});
  return batch;
}
let production=null,productionDrawTimer=null,productionEpoch=0,preflighting=false,productionMessage='';
const productionBusy=()=>Boolean(production?.running||production?.starting||production?.active);
function scheduleProductionDraw(){if(open&&productionDrawTimer===null)productionDrawTimer=setTimeout(()=>{productionDrawTimer=null;if(open)draw()},120)}
function productionMarkup(){
  const locked=running||preflighting||productionBusy(),ready=production?.phase==='BEREIT',r=production?.report(),p=production?.plan;
  return '<div class="asset-batch-footer" aria-busy="'+locked+'"><button type="button" class="admin-primary" data-batch-production="start"'+(!ready||!p.remaining||production.confirmation!=='IMPORT '+p.remaining+' DRAFT-ASSETS'?' disabled':'')+'>'+(p?'IMPORT '+p.remaining+' DRAFT-ASSETS':'PRODUKTIONSIMPORT GESPERRT')+'</button><button type="button" class="admin-secondary" data-batch-production="preflight"'+(!result||locked||production?.started?' disabled':'')+'>Live-Preflight prüfen</button><p class="asset-note" role="status" data-batch-production-message>'+esc(productionMessage||'Pakete 01 Cosmetic, 02 Database / Combat, 03 Database / World Items und 04 Building / Formulas: erst Live-Preflight, dann ausdrücklich bestätigen. Keine automatische Veröffentlichung.')+'</p>'+
    (p?'<div class="asset-batch-summary">'+[['Neue Kandidaten',p.new_candidates],['Bereits vorhanden',p.already_present],['Resumierbare Drafts',p.resumable_drafts],['Review ausgeschlossen',p.review_excluded],['Redundante Duplikate ausgeschlossen',p.redundant_duplicates_excluded],['Konflikte',p.conflicts],['Geplante Bytes',p.total_bytes]].map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div><p class="asset-note">'+esc(p.package_label)+' · Lokaler Dry Run: '+p.dry_run_limit+' eindeutige vorgemerkte Bildinhalte. Frisch aus Supabase: '+production.proof.rows.length+' Assets, '+production.proof.private_rows+' privat. '+production.proof.unverified_hashes.length+' Legacy-Referenzen ohne bestätigten Bildhash. Die Auswahl kann gegenüber dem Dry Run kleiner werden.</p><label class="asset-batch-package">Bestätigung: IMPORT '+p.remaining+' DRAFT-ASSETS<input data-batch-production-confirm value="'+esc(production.confirmation)+'" autocomplete="off"'+(production.started?' disabled':'')+'></label><div class="asset-actions"><button type="button" class="admin-secondary" data-batch-production="pause"'+(!production.running?' disabled':'')+'>Pause</button><button type="button" class="admin-secondary" data-batch-production="resume"'+(production.phase!=='PAUSIERT'?' disabled':'')+'>Fortsetzen</button><button type="button" class="admin-secondary" data-batch-production="stop"'+(!production.running?' disabled':'')+'>Nach aktuellen Uploads stoppen</button><button type="button" class="admin-secondary" data-batch-production="report">Importbericht herunterladen</button></div><p class="asset-note" role="status">'+esc(production.phase)+' · '+planFinished(production)+' / '+p.jobs.length+' · erfolgreich verifiziert '+r.verified_assets+' · vorhanden '+r.already_fully_present+' · Fehler '+r.errors+' · hochgeladen '+r.uploaded_total_bytes+' Bytes · aktuell '+r.active_upload_bytes+' Bytes</p><p class="asset-note">'+esc(production.verification_error)+'</p>':'')+'</div>';
}
const planFinished=b=>b.plan.jobs.filter(j=>['ERFOLGREICH','FORTGESETZT','BEREITS VORHANDEN','FEHLER','KONFLIKT'].includes(j.status)).length;
function downloadBatchReport(){const url=URL.createObjectURL(new Blob([JSON.stringify(production.report(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='asset-library-import-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function productionAction(action){
  try{
    if(action==='preflight'){
      const ticket=++productionEpoch,analysis=result,dryRunCount=report(analysis).selected_unique_image_contents;preflighting=true;production=null;productionMessage='Frische Live-Sitzung, Privatbestand und Storage prüfen …';draw();
      const proof=await globalThis.JMA_ASSET_STORE.batchPreflight();if(ticket!==productionEpoch||analysis!==result||!open)return;
      production=createProductionBatch(analysis,proof,scheduleProductionDraw,dryRunCount);productionMessage='Live-Preflight erfolgreich. Nur die angezeigte Menge kann als Draft importiert werden.';
    }else if(action==='start'||action==='resume'){await production.run(production.confirmation);await config.reload?.()}
    else if(action==='pause')production.requestPause();else if(action==='stop')production.stop();else if(action==='report')downloadBatchReport();
  }catch(error){productionMessage='STOPP: '+error.message;if(production&&!production.started)production=null}
  finally{preflighting=false;clearTimeout(productionDrawTimer);productionDrawTimer=null;if(open)draw()}
}

let open=false,result=null,running=false,message='',analysisController=null,previewController=null,epoch=0,page=1,selected=new Set(),urls=[],previewId='',sourcePackage='OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip',config=null,observer=null,binding=null;
const filters={search:'',type:'',category:'',status:'',duplicate:'',source:'',review:''};
function releasePreviews(){epoch++;previewController?.abort();previewController=null;for(const url of urls)URL.revokeObjectURL(url);urls=[]}
function close(reset=false){clearTimeout(productionDrawTimer);productionDrawTimer=null;if(productionBusy()){production.requestPause();reset=false}analysisController?.abort();running=false;open=false;releasePreviews();binding?.abort();if(reset){productionEpoch++;preflighting=false;production=null;productionMessage='';result=null;selected.clear();previewId='';message='';page=1;for(const key in filters)filters[key]=''}observer?.disconnect();observer=null}
function reset(){close(true)}
function filtered(){return (result?.items||[]).filter(i=>{
  const text=[i.name,i.original_name,i.source_path].join(' ').toLocaleLowerCase('de');
  return (!filters.search||text.includes(filters.search.toLocaleLowerCase('de')))&&(!filters.type||i.asset_type===filters.type)&&(!filters.category||i.category===filters.category)&&(!filters.status||filters.status===(i.valid?'draft':'invalid'))&&(!filters.source||i.classification_source===filters.source)&&(!filters.review||(filters.review==='review'?i.valid&&i.review:filters.review==='clear'?i.valid&&!i.review:!i.valid))&&(!filters.duplicate||(filters.duplicate==='name'?i.name_duplicate:filters.duplicate==='hash'?i.exact_duplicate||i.known_ids.length:filters.duplicate==='imported'?i.already_imported:Object.hasOwn(duplicateRoles,filters.duplicate)?i.duplicate_state===filters.duplicate:!i.name_duplicate&&!i.exact_duplicate&&!i.known_ids.length));
})}
const opts=(values,current,empty='Alle')=>'<option value="">'+esc(empty)+'</option>'+Object.entries(values).map(([id,label])=>'<option value="'+esc(id)+'"'+(current===id?' selected':'')+'>'+esc(label)+'</option>').join('');
const duplicateRoles={representative:'REPRÄSENTANT',covered:'DUPLIKAT – DURCH REPRÄSENTANT ABGEDECKT',existing:'BEREITS VORHANDEN',review:'DUPLIKATGRUPPE IN REVIEW',unselected:'DUPLIKATGRUPPE OHNE REPRÄSENTANT'};
const duplicateText=i=>[duplicateRoles[i.duplicate_state]||'',i.includeOverride!==undefined?'MANUELL '+(i.includeOverride?'VORGEMERKT':'ÜBERSPRUNGEN'):'',i.name_duplicate?'NAME BEREITS VORHANDEN':'',i.exact_duplicate?'EXAKTES BILDDUPLIKAT':'',i.known_ids.length?'IDENTISCHES BEKANNTES BILD':'',i.already_imported?'BEREITS IMPORTIERT':'',i.path_duplicate?'GLEICHER PFAD / ANDERE BILDBYTES':''].filter(Boolean).join(' · ')||'NEU';
function summary(){
  if(!result)return '';
  const r=report(result);return '<div class="asset-batch-summary">'+[['Dateien',r.total_files],['Gültige Bilder',r.valid_images],['Ungültig / ausgeschlossen',r.invalid_files],['Automatisch eindeutig',r.automatically_classified],['ZUORDNUNG PRÜFEN',r.review],['Namensduplikate',r.name_duplicates],['Exakte Duplikate',r.exact_duplicate_files+' / '+r.exact_duplicate_groups+' Gruppen'],['Gruppen mit neuem Repräsentanten',r.duplicate_groups_with_new_representative],['Gruppen bereits vorhanden',r.duplicate_groups_already_present],['Gruppen in Review',r.duplicate_groups_review],['Gruppen ohne Repräsentant',r.duplicate_groups_without_representative.length],['Redundante Kopien übersprungen',r.skipped_redundant_copies],['Eindeutige Bildinhalte vorgemerkt',r.selected_unique_image_contents],['Bereits importiert',r.already_imported],['Vorgemerkt',r.selected_candidates],['Übersprungen',r.skipped_candidates],['Erneut gelesen / nicht doppelt gezählt',r.repeated_entries_not_counted]].map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div><p class="asset-note">PNG '+r.formats.png+' · JPEG '+r.formats.jpg+' · WebP '+r.formats.webp+' · '+r.metadata_files+' Metadatendateien · '+r.loaded_parts.length+' eingelesene ZIPs / Dateien. Bekannte Assets: '+r.known_assets+'; davon '+r.known_assets_with_sha256+' mit vorhandenem SHA-256. Bilder ohne gespeicherten Hash können hier nur über Namen verglichen werden.</p><p class="asset-note">'+Object.keys(labels).filter(k=>k!=='unresolved').map(k=>esc(labels[k])+': '+r.classification_sources[k]).join(' · ')+'</p>';
}
function render(){
  if(!open||!allowed())return '';
  const visible=filtered();page=Math.max(1,Math.min(page,Math.ceil(visible.length/limits.page)||1));
  const part=visible.slice((page-1)*limits.page,page*limits.page),categories=Object.fromEntries([...new Set((result?.items||[]).map(i=>i.category).filter(Boolean))].sort().map(c=>[c,c]));
  return '<section class="asset-batch" data-asset-import><div class="asset-actions"><h3>ZIP / ORDNER IMPORTIEREN</h3><button type="button" class="admin-secondary" data-batch-action="close">Zur Asset-Bibliothek</button></div><p class="asset-note">Lokale Analyse · Originalbytes bleiben unverändert · Produktivimport nur nach Live-Preflight und Bestätigung · ausschließlich Drafts, keine Veröffentlichung.</p><label class="asset-batch-package">Gemeinsames Ursprungspaket<input data-batch-package maxlength="200" value="'+esc(sourcePackage)+'"'+(result||running?' readonly':'')+'></label><p class="asset-note">Teil-ZIPs nacheinander hinzufügen. Manifest und Review-CSV können separat ausgewählt werden. Gleicher Originalpfad + SHA-256 wird nur einmal gezählt.</p><div class="asset-batch-pickers"><label class="admin-secondary">ZIP / Bilder wählen<input type="file" data-batch-files multiple accept=".zip,.png,.jpg,.jpeg,.webp,.csv"'+(running||production?.started||preflighting?' disabled':'')+'></label><label class="admin-secondary">Ordner wählen<input type="file" data-batch-folder multiple webkitdirectory'+(running||production?.started||preflighting?' disabled':'')+'></label><button type="button" class="admin-secondary" data-batch-action="cancel"'+(!running?' hidden':'')+'>Analyse abbrechen</button></div><p role="status" aria-live="polite" data-batch-progress>'+esc(message)+'</p>'+summary()+
    (result?'<div class="asset-actions asset-batch-tabs"><button type="button" class="admin-secondary" data-batch-view="">Alle Dateien</button><button type="button" class="admin-secondary" data-batch-view="review">ZUORDNUNG PRÜFEN</button><button type="button" class="admin-secondary" data-batch-action="export">Dry-Run-Bericht herunterladen</button><button type="button" class="admin-secondary" data-batch-action="clear">Neues Paket / Sitzung leeren</button></div><div class="asset-filters"><label>Suche<input type="search" data-batch-search value="'+esc(filters.search)+'" placeholder="Name oder Pfad"></label>'+[['type','Typ',model.types],['category','Kategorie',categories],['status','Status',{draft:'Entwurf',invalid:'Ungültig / ausgeschlossen'}],['duplicate','Duplikatstatus',{name:'Name bereits vorhanden',hash:'Identisches Bild',representative:'Repräsentant',covered:'Durch Repräsentant abgedeckt',existing:'Bereits vorhanden',review:'Duplikatgruppe in Review',unselected:'Ohne Repräsentant',imported:'Bereits importiert',new:'Neu'}],['source','Klassifizierungsquelle',labels],['review','Zuordnung',{clear:'Eindeutig',review:'ZUORDNUNG PRÜFEN',invalid:'Ungültig'}]].map(([key,label,values])=>'<label>'+label+'<select data-batch-filter="'+key+'">'+opts(values,filters[key])+'</select></label>').join('')+'</div><div class="asset-actions asset-batch-selection">'+[['visible','Alle sichtbaren auswählen'],['clear','Alle eindeutigen auswählen'],['review','Alle unklaren auswählen'],['duplicates','Alle Duplikate auswählen'],['none','Auswahl aufheben']].map(([key,label])=>'<button type="button" class="admin-secondary" data-batch-select="'+key+'">'+label+'</button>').join('')+'</div><div class="asset-batch-bulk"><strong>'+selected.size+' ausgewählt</strong><label>Asset-Typ<select data-batch-bulk-type>'+opts(model.types,'','Typ beibehalten')+'</select></label><label>Kategorie<input data-batch-bulk-category maxlength="80" placeholder="Kategorie beibehalten"></label><button type="button" class="admin-secondary" data-batch-action="classify">Zuordnung übernehmen</button><button type="button" class="admin-secondary" data-batch-action="include">Zum Import vormerken</button><button type="button" class="admin-secondary" data-batch-action="skip">Überspringen</button></div><div class="asset-batch-layout"><div><p>'+visible.length+' Treffer · Seite '+page+' / '+(Math.ceil(visible.length/limits.page)||1)+'</p><div class="asset-list asset-batch-list">'+part.map(i=>'<article class="asset-row asset-batch-row"><label class="asset-batch-check"><input type="checkbox" data-batch-check="'+esc(i.id)+'" aria-label="'+esc(i.name)+' auswählen"'+(selected.has(i.id)?' checked':'')+'></label><button type="button" class="asset-batch-entry" data-batch-preview="'+esc(i.id)+'"><span class="asset-thumb" data-batch-thumb="'+esc(i.id)+'"><b>◇</b></span><span><strong>'+esc(i.name)+'</strong><small>'+esc(i.original_name)+'</small><small>'+esc(i.source_path)+'</small><small>'+esc(model.types[i.asset_type]||'Typ offen')+' · '+esc(i.category||'Kategorie offen')+' · '+(i.size/MiB).toFixed(2)+' MiB'+(i.valid?' · '+i.width+' × '+i.height:'')+'</small><small>'+esc(i.valid?duplicateText(i):i.error)+'</small>'+(i.exact_duplicate?'<small>'+esc(i.representative_path?'Repräsentant: '+i.representative_path:i.selection_reason)+'</small>':'')+(i.candidate_error?'<small>'+esc(i.candidate_error)+'</small>':'')+'<small>'+esc(labels[i.classification_source])+' · '+esc(i.reason||'')+'</small><small>'+esc(i.valid?(i.include&&!i.review?'VORGEMERKT · DRAFT':'ÜBERSPRUNGEN · DRAFT'):'AUSGESCHLOSSEN')+'</small>'+(i.sha256?'<small class="asset-batch-sha">SHA-256 '+esc(i.sha256)+'</small>':'')+(i.notes.length?'<small>'+esc(i.notes.join(' · '))+'</small>':'')+(production?.plan.jobs.find(j=>j.item.id===i.id)?'<small>'+esc(production.plan.jobs.find(j=>j.item.id===i.id).status+' · '+production.plan.jobs.find(j=>j.item.id===i.id).error)+'</small>':'')+'</span></button>'+(production?.plan.jobs.some(j=>j.item.id===i.id&&j.status==='FEHLER')?'<button type="button" class="admin-secondary" data-batch-retry="'+esc(i.id)+'"'+(productionBusy()?' disabled':'')+'>Fehler erneut versuchen</button>':'')+'</article>').join('')+'</div><div class="asset-actions asset-batch-pagination"><button type="button" class="admin-secondary" data-batch-action="previous"'+(page===1?' disabled':'')+'>Zurück</button><button type="button" class="admin-secondary" data-batch-action="next"'+(page*limits.page>=visible.length?' disabled':'')+'>Weiter</button></div></div><aside class="admin-glass asset-preview" data-batch-preview-panel><span class="eyebrow">LOKALE ASSET-VORSCHAU</span><div data-batch-preview-body>Ein Bild auswählen.</div></aside></div><details class="asset-note"><summary>Metadatenhinweise ('+result.warnings.length+')</summary>'+result.warnings.map(w=>'<p>'+esc(w)+'</p>').join('')+'</details>':'')+
    productionMarkup()+'</section>';
}
function draw(){releasePreviews();const target=document.querySelector('[data-asset-import]');if(target){target.outerHTML=render();bind(config)}}
async function hydrate(){
  const root=document.querySelector('[data-asset-import]');if(!root||!result||running)return;
  releasePreviews();const ticket=epoch;previewController=new AbortController();const signal=previewController.signal;
  const pending=[...root.querySelectorAll('[data-batch-thumb]')];let cursor=0;
  async function localURL(item){const file=await item.read(signal);check(signal);const url=URL.createObjectURL(file);if(ticket!==epoch){URL.revokeObjectURL(url);return ''}urls.push(url);return url}
  const chosen=result.items.find(i=>i.id===previewId&&i.valid);
  if(chosen){try{const url=await localURL(chosen);if(ticket===epoch){const row={...chosen,status:'draft',metadata:{original_name:chosen.original_name,source_path:chosen.source_path,sha256:chosen.sha256,classification_source:chosen.classification_source},file_ref:null};root.querySelector('[data-batch-preview-body]').innerHTML=config.previewMarkup(row,config.known(),url,{original_name:chosen.original_name});config.hydrateImages(root.querySelector('[data-batch-preview-body]'))}}catch(error){if(ticket===epoch)root.querySelector('[data-batch-preview-body]').textContent=error.message}}
  const run=async()=>{while(cursor<pending.length){const target=pending[cursor++],item=result?.items.find(i=>i.id===target.dataset.batchThumb);if(!item?.valid)continue;try{const url=await localURL(item);if(ticket!==epoch)return;const image=new Image();image.src=url;image.alt='';image.loading='lazy';target.replaceChildren(image)}catch{if(ticket!==epoch)return}}};
  await Promise.all([run(),run()]);
}
async function start(files){
  if(running||preflighting||production?.started||!allowed())return;production=null;productionMessage='';
  analysisController?.abort();analysisController=new AbortController();const controller=analysisController;
  releasePreviews();page=1;running=true;message='Lokale Analyse / Teil hinzufügen …';draw();
  try{
    const next=await analyze({files,known:config.known(),sourcePackage,previous:result,signal:controller.signal,onProgress:p=>{if(controller!==analysisController)return;message=p.stage+' · '+p.done+' / '+p.total;const target=document.querySelector('[data-batch-progress]');if(target)target.textContent=message}});
    if(controller!==analysisController||controller.signal.aborted)return;result=next;message='Analyse abgeschlossen. Kein Asset wurde gespeichert.';
  }catch(error){if(controller===analysisController)message=error.name==='AbortError'?'Analyse abgebrochen. Es wurde nichts gespeichert.':error.message}
  finally{if(controller===analysisController){running=false;if(open)draw()}}
}
function bind(settings){
  config=settings;binding?.abort();if(!open||!allowed())return;const root=document.querySelector('[data-asset-import]');if(!root)return;
  binding=new AbortController();const events={signal:binding.signal};
  root.querySelector('[data-batch-package]')?.addEventListener('input',e=>{sourcePackage=e.target.value.trim()},events);
  root.querySelectorAll('[data-batch-files],[data-batch-folder]').forEach(input=>input.addEventListener('change',e=>start([...e.target.files]),events));
  root.querySelector('[data-batch-search]')?.addEventListener('input',e=>{filters.search=e.target.value;page=1;const position=e.target.selectionStart;draw();const input=document.querySelector('[data-batch-search]');input?.focus();input?.setSelectionRange(position,position)},events);
  root.querySelector('[data-batch-production-confirm]')?.addEventListener('input',e=>{production.confirmation=e.target.value;root.querySelector('[data-batch-production="start"]').disabled=production.phase!=='BEREIT'||!production.plan.remaining||e.target.value!=='IMPORT '+production.plan.remaining+' DRAFT-ASSETS'},events);
  root.addEventListener('change',e=>{if(e.target.dataset.batchFilter){filters[e.target.dataset.batchFilter]=e.target.value;page=1;draw()}if(e.target.dataset.batchCheck){e.target.checked?selected.add(e.target.dataset.batchCheck):selected.delete(e.target.dataset.batchCheck);const count=root.querySelector('.asset-batch-bulk strong');if(count)count.textContent=selected.size+' ausgewählt'}},events);
  root.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.batchProduction){productionAction(button.dataset.batchProduction);return}
    if(button.dataset.batchRetry){try{production.retry(button.dataset.batchRetry)}catch(error){productionMessage=error.message;draw()}return}
    if(button.hasAttribute('data-batch-view')){filters.review=button.dataset.batchView;page=1;draw();return}
    if(button.dataset.batchPreview){previewId=button.dataset.batchPreview;hydrate();return}
    if(button.dataset.batchSelect){const mode=button.dataset.batchSelect;if(mode==='none')selected.clear();else for(const i of mode==='visible'?filtered().slice((page-1)*limits.page,page*limits.page):filtered()){if(mode==='visible'||mode==='clear'&&i.valid&&!i.review||mode==='review'&&i.valid&&i.review||mode==='duplicates'&&(i.name_duplicate||i.exact_duplicate||i.known_ids.length))selected.add(i.id)}draw();return}
    const action=button.dataset.batchAction;
    if(action==='close'){close();config.rerender();document.querySelector('[data-asset-import-open]')?.focus();return}
    if(action==='clear'){if(running||productionBusy())return;production=null;productionMessage='';result=null;selected.clear();previewId='';message='Lokale Sitzung geleert.';page=1;for(const key in filters)filters[key]='';draw();return}
    if(action==='cancel'){analysisController?.abort();return}
    if(action==='previous'||action==='next'){page+=action==='next'?1:-1;draw();return}
    if(action==='export'&&result){
      const rows=result.items.map(i=>({id:i.id,name:i.name,source_package:i.source_package,source_path:i.source_path,original_name:i.original_name,size:i.size,width:i.width,height:i.height,sha256:i.sha256,asset_type:i.asset_type||'',category:i.category||'',status:'draft',classification_source:i.classification_source,reason:i.reason,review:i.review,include:i.include&&!i.review,valid:i.valid,error:i.error,duplicate_status:duplicateText(i),duplicate_state:i.duplicate_state,representative_id:i.representative_id,representative_path:i.representative_path,selection_reason:i.selection_reason,selection_override:i.includeOverride,candidate_error:i.candidate_error,known_ids:i.known_ids,notes:i.notes,source_manifest:i.manifest||null,...(i.include&&!i.review?{candidate:candidate(i)}:{})}));
      const url=URL.createObjectURL(new Blob([JSON.stringify({report:report(result),items:rows,duplicate_groups:[...new Map(result.items.filter(i=>i.exact_duplicate).map(i=>[i.sha256,i])).values()].map(i=>({sha256:i.sha256,state:i.known_ids.length?'existing':i.representative_id?'representative':i.duplicate_state,representative_id:i.representative_id,representative_path:i.representative_path,reason:i.selection_reason,duplicate_sources:i.duplicate_sources}))},null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='asset-library-dry-run.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(['classify','include','skip'].includes(action)&&result){
      if(preflighting||production?.started)return;production=null;productionMessage='';
      const type=root.querySelector('[data-batch-bulk-type]').value,category=root.querySelector('[data-batch-bulk-category]').value.trim();
      for(const i of result.items.filter(i=>selected.has(i.id)&&i.valid)){
        if(action==='classify'){
          if(type)i.asset_type=type;if(category)i.category=category;
          if(type||category){i.manualClassification={type:i.asset_type,category:i.category};i.classification_source='manual';i.reason='Vom Admin im lokalen Dry Run bestätigt.';i.review=!Object.hasOwn(model.types,i.asset_type)||!i.category;if(i.review)i.include=false}
        }else if(action==='skip'){i.include=false;i.includeOverride=false}
        else if(!i.review){i.include=true;i.includeOverride=true}
      }
      selectRepresentatives(result.items);
      message=action==='include'?'Eindeutige ausgewählte Bilder vorgemerkt. Review-Dateien bleiben ausgeschlossen.':'Lokale Auswahl aktualisiert; Status bleibt draft.';draw();
    }
  },events);
  if(!observer){observer=new MutationObserver(()=>{if(!document.querySelector('.asset-library')||!allowed())reset()});observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true})}
  hydrate();
}
function show(settings){if(!allowed())return false;config=settings;open=true;return true}
window.addEventListener('beforeunload',e=>{if(productionBusy()){e.preventDefault();e.returnValue=''}});
window.addEventListener('hashchange',()=>{if(location.hash.split('?')[0]!=='#/admin')reset()});window.addEventListener('pagehide',reset);
globalThis.ASSET_LIBRARY_IMPORT=Object.freeze({show,render,bind,reset,isOpen:()=>open,analyze,report,candidate,safePath,parseCSV,buildBatchPlan,createProductionBatch});
})();
