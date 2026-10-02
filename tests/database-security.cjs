// Uses the existing production migrations in isolated PostgreSQL. No live writes.
const assert=require('node:assert/strict');const {setup,asRole,ids}=require('./asset-library-sql.cjs');
(async()=>{const db=await setup();let checks=0;const ok=(value,label)=>{assert.ok(value,label);console.log('PASS CATALOG SECURITY',++checks,label)};
try{
 const original=(await db.query("select * from catalog_entries where id='cat-tier-fuchs'")).rows[0];
 ok((await db.query("select relrowsecurity from pg_class where oid='public.catalog_entries'::regclass")).rows[0].relrowsecurity,'Existing catalog RLS is enabled');
 for(const role of ['anon','user'])await asRole(db,role,async()=>{
  await assert.rejects(()=>db.query('insert into catalog_entries(id,entry,updated_by) values($1,$2,$3)',['denied-'+role,{...original.entry,id:'denied-'+role},ids[role]||null]));ok(true,role+' insert is blocked by actual SQL grants/RLS');
  if(role==='anon')await assert.rejects(()=>db.query("update catalog_entries set entry=entry || '{\"archived\":true}'::jsonb where id='cat-tier-fuchs'"));
  else ok((await db.query("update catalog_entries set entry=entry || '{\"archived\":true}'::jsonb,revision=2,updated_by=$1 where id='cat-tier-fuchs' returning id",[ids.user])).rows.length===0,'User update affects no rows under RLS');
  if(role==='anon')ok(true,'Anon update is blocked by table privileges');
  await assert.rejects(()=>db.query("delete from catalog_entries where id='cat-tier-fuchs'"));ok(true,role+' hard delete is blocked');
 });
 ok(JSON.stringify((await db.query("select * from catalog_entries where id='cat-tier-fuchs'")).rows[0])===JSON.stringify(original),'Denied operations preserve real Fuchs row, revision and image relationship');
 for(const role of ['moderator','admin','owner'])await asRole(db,role,async()=>{
  const id='catalog-security-'+role;
  await db.query('insert into catalog_entries(id,entry,updated_by) values($1,$2,$3)',[id,{...original.entry,id},ids[role]]);
  const changed=await db.query('update catalog_entries set entry=entry || $1::jsonb,revision=2,updated_by=$2 where id=$3 and revision=1 returning revision',[{description:'Isolated permitted edit'},ids[role],id]);
  ok(changed.rows[0].revision===2,role+' uses existing permitted create/edit policies');
  ok((await db.query('update catalog_entries set revision=2,updated_by=$1 where id=$2 and revision=1 returning id',[ids[role],id])).rows.length===0,role+' stale revision write returns no row');
  await assert.rejects(()=>db.query('update catalog_entries set updated_by=$1 where id=$2',[ids.user,id]));ok(true,role+' cannot forge another user audit identity');
  await assert.rejects(()=>db.query('delete from catalog_entries where id=$1',[id]));ok(true,role+' cannot hard-delete through catalog grants');
 });
 console.log('PASS catalog-security checks:',checks);
}finally{await db.close()}})().catch(error=>{console.error(error);process.exitCode=1});
