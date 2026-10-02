// Additive migration and Storage RLS tested locally; never connects to live Supabase.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {setup,setupStorage,asRole}=require('./asset-library-sql.cjs');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261002020000_asset_library_storage.sql'),'utf8');
(async()=>{
 const db=await setup();let checks=0;
 const ok=(v,label)=>{assert.ok(v,label);console.log('PASS STORAGE SQL',++checks,label)};
 const denied=async(fn,label)=>{await assert.rejects(fn);console.log('PASS STORAGE SQL',++checks,label)};
 try{
  await db.query("insert into asset_library(id,name,asset_type,status,revision) values('previous-archived-verification','Previous verification','image','archived',1)");
  const before=(await db.query('select * from asset_library order by id')).rows;
  const catalog=(await db.query('select * from catalog_entries order by id')).rows;
  await setupStorage(db);
  const bucket=(await db.query("select * from storage.buckets where id='archive-assets'")).rows[0];
  ok(!bucket.public&&Number(bucket.file_size_limit)===8388608&&bucket.allowed_mime_types.length===3,'One private 8 MiB raster-only bucket');
  ok(JSON.stringify(before)===JSON.stringify((await db.query('select * from asset_library order by id')).rows.map(({storage_bucket,storage_path,...row})=>row)),'All 129 previous rows and audit/revisions preserved');
  ok(JSON.stringify(catalog)===JSON.stringify((await db.query('select * from catalog_entries order by id')).rows),'All 21 catalog rows preserved');
  for(const role of ['moderator','admin','owner'])await asRole(db,role,async()=>{
   const id='upload-'+role,oldPath='library/'+id+'/'+randomUUID()+'.png',newPath='library/'+id+'/'+randomUUID()+'.webp';
   await db.query("insert into asset_library(id,name,asset_type,status) values($1,'Upload test','image','draft')",[id]);
   await db.query("insert into storage.objects(bucket_id,name,metadata) values('archive-assets',$1,$2)",[oldPath,{mimetype:'image/png',size:200}]);
   ok((await db.query('select * from storage.objects where name=$1',[oldPath])).rows.length===1,role+' can upload/read staged object');
   for(const viewer of ['anon','user']){
    // asRole restores postgres, so explicitly resume the current authenticated role afterward.
    await asRole(db,viewer,async()=>ok((await db.query('select * from storage.objects where name=$1',[oldPath])).rows.length===0,viewer+' cannot read staged '+role+' object'));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[require('./asset-library-sql.cjs').ids[role]]);await db.exec('set role authenticated');
   }
   await denied(()=>db.query("update asset_library set status='active',storage_bucket='archive-assets',storage_path=$1,revision=2 where id=$2",['library/'+id+'/'+randomUUID()+'.png',id]),role+' cannot activate missing object');
   await denied(()=>db.query("update asset_library set storage_path=$1,revision=2 where id=$2",[oldPath,id]),role+' partial storage reference denied');
   await db.query("update asset_library set storage_bucket='archive-assets',storage_path=$1,revision=2 where id=$2",[oldPath,id]);
   ok((await db.query('select status,revision,users_available from asset_library where id=$1',[id])).rows[0].status==='draft',role+' saves Storage pointer as draft');
   await db.query("update asset_library set status='active',revision=3 where id=$1",[id]);
   for(const viewer of ['anon','user']){
    await asRole(db,viewer,async()=>ok((await db.query('select * from storage.objects where name=$1',[oldPath])).rows.length===1,viewer+' reads only active current '+role+' object'));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[require('./asset-library-sql.cjs').ids[role]]);await db.exec('set role authenticated');
   }
   await denied(()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('archive-assets',$1,$2)",[oldPath,{mimetype:'image/png',size:200}]),role+' duplicate path never overwritten');
   await denied(()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('archive-assets','library/missing/00000000-0000-0000-0000-000000000001.png','{}')"),role+' orphan ID upload denied');
   await denied(()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('archive-assets','library/../bad.svg','{}')"),role+' unsafe path and SVG denied');
   await denied(()=>db.query("update asset_library set file_ref='assets/branding/once-human-logo.png',revision=4 where id=$1",[id]),role+' cannot store two image sources');
   await db.query("insert into storage.objects(bucket_id,name,metadata) values('archive-assets',$1,$2)",[newPath,{mimetype:'image/webp',size:210}]);
   await db.query('update asset_library set storage_path=$1,revision=4 where id=$2 and revision=3',[newPath,id]);
   ok((await db.query('select * from storage.objects where name in ($1,$2)',[oldPath,newPath])).rows.length===2,role+' replacement preserves both file versions');
   for(const status of ['inactive','archived']){
    await db.query('update asset_library set status=$1,revision=revision+1 where id=$2',[status,id]);
    await asRole(db,'user',async()=>ok((await db.query('select * from storage.objects where name in ($1,$2)',[oldPath,newPath])).rows.length===0,'User cannot read '+role+' '+status+' or old objects'));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[require('./asset-library-sql.cjs').ids[role]]);await db.exec('set role authenticated');
   }
  });
  // Challenge restrictive guards with an unrelated broad permissive policy.
  await db.exec(`insert into storage.buckets(id,name) values('unrelated','unrelated');
    create policy broad_fixture_objects on storage.objects for all to anon,authenticated using(true) with check(true);
    create policy broad_fixture_buckets on storage.buckets for all to anon,authenticated using(true) with check(true);`);
  for(const role of ['anon','user','moderator','admin','owner'])await asRole(db,role,async()=>{
   if(['anon','user'].includes(role)){
    await denied(()=>db.query("insert into storage.objects(bucket_id,name) values('archive-assets',$1)",['library/upload-owner/'+randomUUID()+'.png']),role+' upload denied even with broad policy');
    ok((await db.query("select * from storage.objects where bucket_id='archive-assets'")).rows.length===0,role+' cannot bypass release policy with broad policy');
   }
   ok((await db.query("update storage.objects set metadata='{}' where bucket_id='archive-assets' returning id")).rows.length===0,role+' cannot overwrite Storage objects');
   ok((await db.query("delete from storage.objects where bucket_id='archive-assets' returning id")).rows.length===0,role+' cannot delete Storage objects');
   ok((await db.query("update storage.buckets set public=true where id='archive-assets' returning id")).rows.length===0,role+' cannot make bucket public');
   ok((await db.query("delete from storage.buckets where id='archive-assets' returning id")).rows.length===0,role+' cannot delete private bucket');
   const name=randomUUID();await db.query("insert into storage.objects(bucket_id,name) values('unrelated',$1)",[name]);
   ok((await db.query("delete from storage.objects where bucket_id='unrelated' and name=$1 returning id",[name])).rows.length===1,role+' unrelated bucket permissions preserved');
  });
  await asRole(db,'owner',async()=>{
   for(const metadata of [{mimetype:'image/svg+xml',size:100},{mimetype:'image/png',size:8388609},{mimetype:'image/png',size:'x'},{mimetype:'image/png',size:0}]){
    const p='library/upload-owner/'+randomUUID()+'.png';await db.query("insert into storage.objects(bucket_id,name,metadata) values('archive-assets',$1,$2)",[p,metadata]);
    await denied(()=>db.query('update asset_library set storage_path=$1,revision=revision+1 where id=$2',[p,'upload-owner']),'DB pointer guard rejects incompatible object '+JSON.stringify(metadata));
   }
  });
  await db.exec(migration);
  ok((await db.query("select revision,status from asset_library where id='upload-owner'")).rows[0].revision===6,'Additive migration can rerun without losing state');
  await db.query("update storage.buckets set public=true where id='archive-assets'");
  await denied(()=>db.exec(migration),'Conflicting bucket config aborts instead of silently changing it');await db.exec('rollback');
  console.log('PASS STORAGE SQL checks:',checks);
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
