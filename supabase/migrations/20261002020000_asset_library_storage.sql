-- Phase 2A: one private bucket, normalized references on the EXISTING asset_library.
-- Apply ONLY this new migration. No legacy seed/file changes; no Storage uploads.
begin;

do $$ begin
  if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity)
    or not exists(select 1 from pg_class where oid='storage.buckets'::regclass and relrowsecurity) then
    raise exception 'Expected platform Storage RLS is disabled; migration aborted';
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('archive-assets','archive-assets',false,8388608,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from storage.buckets where id='archive-assets' and name='archive-assets'
    and public=false and file_size_limit=8388608
    and allowed_mime_types @> array['image/png','image/jpeg','image/webp']
    and allowed_mime_types <@ array['image/png','image/jpeg','image/webp']) then
    raise exception 'Conflicting archive-assets bucket configuration; migration aborted';
  end if;
end $$;

alter table public.asset_library add column if not exists storage_bucket text;
alter table public.asset_library add column if not exists storage_path text;
do $$ begin
  if exists(select 1 from pg_constraint where conrelid='public.asset_library'::regclass and conname='asset_library_check') then
    if not exists(select 1 from pg_constraint where conrelid='public.asset_library'::regclass and conname='asset_library_check'
      and pg_get_constraintdef(oid) like '%status%' and pg_get_constraintdef(oid) like '%file_ref%'
      and pg_get_constraintdef(oid) like '%asset_type%') then
      raise exception 'Legacy asset image constraint differs; migration aborted';
    end if;
    alter table public.asset_library drop constraint asset_library_check;
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.asset_library'::regclass and conname='asset_library_storage_ref_check') then
    alter table public.asset_library add constraint asset_library_storage_ref_check check (
      (storage_bucket is null and storage_path is null) or
      (storage_bucket is not null and storage_bucket='archive-assets' and storage_path is not null and file_ref is null
        and split_part(storage_path,'/',2)=id
        and storage_path ~ '^library/[A-Za-z0-9][A-Za-z0-9._:-]{0,159}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$')
    );
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.asset_library'::regclass and conname='asset_library_active_image_check') then
    alter table public.asset_library add constraint asset_library_active_image_check check (
      status<>'active' or file_ref is not null or storage_path is not null or asset_type in ('ring','wreath','trophy')
    );
  end if;
end $$;
create unique index if not exists asset_library_storage_ref_unique on public.asset_library(storage_bucket,storage_path);
grant insert(storage_bucket,storage_path),update(storage_bucket,storage_path) on public.asset_library to authenticated;
comment on column public.asset_library.storage_path is 'Immutable object versions under library/<asset ID>/<UUID>.<extension>. Never a URL; one current reference per asset.';

-- Private policy helpers reuse the existing role hierarchy. No extra auth/data table.
-- SECURITY DEFINER lets the policy inspect release metadata without recursive RLS.
create or replace function private.asset_storage_readable(bucket text, object_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select bucket='archive-assets' and (
    exists(select 1 from public.asset_library a where a.storage_bucket=bucket and a.storage_path=object_name and a.status='active')
    or ((select private.has_role_at_least('moderator'::public.app_role))
      and exists(select 1 from public.asset_library a where a.id=split_part(object_name,'/',2) and split_part(object_name,'/',1)='library'))
  );
$$;
create or replace function private.asset_storage_uploadable(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select (select private.has_role_at_least('moderator'::public.app_role))
    and object_name ~ '^library/[A-Za-z0-9][A-Za-z0-9._:-]{0,159}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
    and exists(select 1 from public.asset_library a where a.id=split_part(object_name,'/',2));
$$;
revoke all on function private.asset_storage_readable(text,text) from public,anon,authenticated;
revoke all on function private.asset_storage_uploadable(text) from public,anon,authenticated;
grant execute on function private.asset_storage_readable(text,text) to anon,authenticated;
grant execute on function private.asset_storage_uploadable(text) to anon,authenticated;

-- A pointer is committed only AFTER an actual compatible Storage object exists.
create or replace function private.guard_asset_storage()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.storage_path is not null and not exists(
    select 1 from storage.objects o where o.bucket_id=new.storage_bucket and o.name=new.storage_path
      and o.metadata->>'mimetype' in ('image/png','image/jpeg','image/webp')
      and case when o.metadata->>'size' ~ '^[0-9]{1,10}$'
        then (o.metadata->>'size')::bigint between 1 and 8388608 else false end
  ) then
    raise exception 'Storage image missing or incompatible; asset reference not saved' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.guard_asset_storage() from public,anon,authenticated;
drop trigger if exists asset_library_storage_guard on public.asset_library;
create trigger asset_library_storage_guard before insert or update on public.asset_library
for each row execute function private.guard_asset_storage();

-- Permissive policies provide the new bucket's positive permissions.
drop policy if exists archive_assets_read on storage.objects;
create policy archive_assets_read on storage.objects for select to anon,authenticated
using(private.asset_storage_readable(bucket_id,name));
drop policy if exists archive_assets_upload on storage.objects;
create policy archive_assets_upload on storage.objects for insert to authenticated
with check(bucket_id='archive-assets' and private.asset_storage_uploadable(name));

-- Restrictive guards keep this bucket protected if another bucket later needs broad policies.
-- All other bucket permissions remain unchanged. No object overwrite/delete in Phase 2A.
drop policy if exists archive_assets_read_guard on storage.objects;
create policy archive_assets_read_guard on storage.objects as restrictive for select to anon,authenticated
using(bucket_id<>'archive-assets' or private.asset_storage_readable(bucket_id,name));
drop policy if exists archive_assets_upload_guard on storage.objects;
create policy archive_assets_upload_guard on storage.objects as restrictive for insert to anon,authenticated
with check(bucket_id<>'archive-assets' or private.asset_storage_uploadable(name));
drop policy if exists archive_assets_no_overwrite on storage.objects;
create policy archive_assets_no_overwrite on storage.objects as restrictive for update to anon,authenticated
using(bucket_id<>'archive-assets') with check(bucket_id<>'archive-assets');
drop policy if exists archive_assets_no_delete on storage.objects;
create policy archive_assets_no_delete on storage.objects as restrictive for delete to anon,authenticated
using(bucket_id<>'archive-assets');
drop policy if exists archive_assets_bucket_no_update on storage.buckets;
create policy archive_assets_bucket_no_update on storage.buckets as restrictive for update to anon,authenticated
using(id<>'archive-assets') with check(id<>'archive-assets');
drop policy if exists archive_assets_bucket_no_delete on storage.buckets;
create policy archive_assets_bucket_no_delete on storage.buckets as restrictive for delete to anon,authenticated
using(id<>'archive-assets');

notify pgrst, 'reload schema';
commit;
