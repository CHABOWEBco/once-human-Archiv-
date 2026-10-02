// Real PostgreSQL (PGlite) validation, using the unchanged existing role/catalog migrations.
// Install @electric-sql/pglite outside the checkout and set ASSET_TEST_PGLITE to its package path.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.ASSET_TEST_PGLITE||'@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261002010000_asset_library.sql'),'utf8');
const ids={user:'00000000-0000-0000-0000-000000000001',moderator:'00000000-0000-0000-0000-000000000002',admin:'00000000-0000-0000-0000-000000000003',owner:'00000000-0000-0000-0000-000000000004'};
async function setup(){
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of ['20260929000000_core_profiles_roles.sql','20261001010000_catalog_entries.sql'])await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
  for(const [role,id]of Object.entries(ids)){
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,role+'@example.invalid',{}]);
    await db.query('update public.user_roles set role=$1 where user_id=$2',[role,id]);
  }
  await db.exec(migration);
  return db;
}
async function asRole(db,role,operation){
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[role]||'']);
  await db.exec('set role '+(role==='anon'?'anon':'authenticated'));
  try{return await operation()}finally{await db.exec('reset role')}
}
// Minimal platform Storage schema only for isolated tests, using real PostgreSQL RLS.
async function setupStorage(db){
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
    alter table storage.buckets enable row level security; alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated; grant all on storage.buckets,storage.objects to anon,authenticated;`);
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261002020000_asset_library_storage.sql'),'utf8'));
}
async function run(){
  const db=await setup();let checks=0;
  const ok=(value,label)=>{assert.ok(value,label);console.log('PASS SQL',++checks,label)};
  const denied=async(task,label)=>{await assert.rejects(task);console.log('PASS SQL',++checks,label)};
  try{
    const original=(await db.query('select id,entry,revision from catalog_entries order by id')).rows;
    const count=Number((await db.query('select count(*) from asset_library')).rows[0].count);
    ok(count===128,'107 static/CSS assets plus all 21 catalog entries seeded');
    await db.query("insert into catalog_entries(id,entry) values ('live-added',$1)",[{id:'live-added',name_de:'Later live row',category:'items',image:'assets/r13/item-permit.svg'}]);
    await db.exec(migration);
    ok((await db.query("select count(*) from asset_library where catalog_id='live-added'")).rows[0].count===1,'Migration includes current live catalog additions');
    for(const role of ['moderator','admin','owner'])await asRole(db,role,async()=>{
      const row=(await db.query("insert into asset_library(id,name,asset_type) values($1,'Test','image') returning *",['test-'+role])).rows[0];
      ok(row.revision===1&&row.created_by===ids[role]&&!row.users_available,role+' creates draft with server audit stamp');
      await db.query("update asset_library set file_ref='assets/branding/once-human-logo.png',status='active',revision=2 where id=$1 and revision=1",[row.id]);
      ok((await db.query('select * from asset_library where id=$1',[row.id])).rows[0].users_available,role+' activates');
      const stale=await db.query("update asset_library set name='Stale',revision=2 where id=$1 and revision=1 returning id",[row.id]);
      ok(stale.rows.length===0,role+' stale conditional write returns no row');
      await denied(()=>db.query("update asset_library set name='Bad revision' where id=$1",[row.id]),role+' cannot bypass revision increment');
      await denied(()=>db.query('update asset_library set id=$1,revision=3 where id=$2',['changed-id',row.id]),role+' cannot change stable identity');
      await denied(()=>db.query('delete from asset_library where id=$1',[row.id]),role+' hard delete denied');
      for(const [index,status]of ['inactive','archived'].entries()){
        const saved=(await db.query('update asset_library set status=$1,revision=$2 where id=$3 returning *',[status,index+3,row.id])).rows[0];
        ok(!saved.users_available&&saved.status===status,role+' '+status+' is unavailable');
      }
      await denied(()=>db.query("insert into asset_library(id,name,asset_type,status,file_ref) values('unsafe','Unsafe','image','active','assets/../bad.svg')"),role+' unsafe reference denied');
      await denied(()=>db.query("insert into asset_library(id,name,asset_type,status) values('empty-active','Empty','image','active')"),role+' active image requires reference');
      await denied(()=>db.query("insert into asset_library(id,name,asset_type,catalog_id) values('fk-missing','Missing','image','absent')"),role+' catalog foreign key enforced');
      await denied(()=>db.query("insert into asset_library(id,name,asset_type,users_available) values('fake-release','Fake','image',true)"),role+' cannot override derived availability');
    });
    for(const role of ['anon','user'])await asRole(db,role,async()=>{
      const hidden=(await db.query("select id from asset_library where status<>'active'")).rows;
      ok(hidden.length===0,role+' sees only active assets');
      await denied(()=>db.query("insert into asset_library(id,name,asset_type) values('user-write','Forbidden','image')"),role+' insert denied by DB');
      if(role==='user')ok((await db.query("update asset_library set name='Forbidden',revision=2 where id='website:logo' returning id")).rows.length===0,'User cannot update an active asset');
      else await denied(()=>db.query("update asset_library set name='Forbidden',revision=2 where id='website:logo'"),'Anon update denied');
    });
    await db.exec(migration);
    ok((await db.query("select status,revision from asset_library where id='test-owner'")).rows[0].revision===4,'Rerunning migration preserves saved state/revisions');
    const current=(await db.query("select id,entry,revision from catalog_entries where id<>'live-added' order by id")).rows;
    ok(JSON.stringify(original)===JSON.stringify(current),'Existing catalog rows/content/revisions unchanged');
    const sqlSeeds=(await db.query("select id,file_ref from asset_library where catalog_id is null and id not like 'test-%'")).rows;
    ok(sqlSeeds.every(r=>r.file_ref===null||fs.existsSync(path.join(root,r.file_ref))),'Every seeded image reference exists');
    require('../asset-library-model.js');
    await asRole(db,'owner',async()=>{
      for(const ref of ['assets/%2e%2e/bad.svg','assets/a\\bad.svg','assets/a?bad.svg','assets/a:bad.svg']){
        assert.equal(ASSET_LIBRARY_MODEL.fileAllowed(ref),false);
        await assert.rejects(()=>db.query("insert into asset_library(id,name,asset_type,file_ref) values('encoded-unsafe','Unsafe','image',$1)",[ref]));
      }
    });
    ok(true,'Client and DB reject encoded traversal, backslash, query and scheme characters');
    await db.query('delete from auth.users where id=$1',[ids.owner]);
    ok((await db.query("select created_by,revision from asset_library where id='test-owner'")).rows[0].created_by===ids.owner,'Auth account deletion preserves historical asset audit/revision');
    console.log('PASS SQL checks:',checks);
  }finally{await db.close()}
}
module.exports={setup,setupStorage,asRole,ids};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1});
