-- B-12: diagnostic assertions only. No schema/row/permission mutations.
-- Run in the existing project's SQL Editor as postgres.
begin read only;
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r';
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public'
order by table_name,ordinal_position;
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public';
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and grantee in('anon','authenticated');
select table_name, column_name, grantee, privilege_type
from information_schema.role_column_grants
where table_schema='public' and grantee in('anon','authenticated') and privilege_type<>'SELECT';
select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid
join pg_namespace n on n.oid=t.typnamespace
where n.nspname='public' and t.typname='app_role' order by enumsortorder;
select p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private';
select n.nspname,c.relname,pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and ((n.nspname='public') or (n.nspname='auth' and c.relname='users'));
select count(*) as entries,count(distinct id) as unique_ids,
count(distinct entry->>'category') as used_categories,
count(*) filter(where id<>entry->>'id') as invalid_ids,
json_agg(distinct revision) as revisions from public.catalog_entries;
do $audit$
declare account_id text;
begin
 if not has_table_privilege('anon','public.catalog_entries','SELECT') or has_table_privilege('anon','public.catalog_entries','INSERT,UPDATE,DELETE') then raise exception 'Anonymous catalog grants differ'; end if;
 if has_table_privilege('authenticated','public.user_roles','INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.catalog_entries','DELETE') then raise exception 'Unexpected role or delete grants'; end if;
 if not has_column_privilege('authenticated','public.catalog_entries','entry','UPDATE') or has_column_privilege('authenticated','public.catalog_entries','id','UPDATE') or has_column_privilege('authenticated','public.catalog_entries','created_at','UPDATE') then raise exception 'Catalog update grants differ'; end if;
 if not has_column_privilege('authenticated','public.profiles','display_name','UPDATE') or has_column_privilege('authenticated','public.profiles','id','UPDATE') then raise exception 'Profile grants differ'; end if;
 select user_id::text into account_id from public.user_roles where role='owner' limit 1;
 if account_id is null then raise exception 'No owner found for helper verification'; end if;
 perform set_config('request.jwt.claim.sub',account_id,true);
 if not private.has_role_at_least('moderator'::public.app_role) or not private.has_role_at_least('owner'::public.app_role) then raise exception 'Owner helper rejected'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 if private.has_role_at_least('user'::public.app_role) or private.has_role_at_least('moderator'::public.app_role) then raise exception 'Unassigned identity accepted'; end if;
end;
$audit$;
rollback;
