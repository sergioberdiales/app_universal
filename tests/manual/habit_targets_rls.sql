-- ONLY on a fresh disposable PostgreSQL database; creates fake auth objects.
\set ON_ERROR_STOP on
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
DO $$ begin if not exists (select from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;
grant usage on schema public, auth to authenticated;
\ir ../../supabase_habits.sql
-- Reproduce pre-migration schema and data.
alter table habits drop column target_percentage;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into habits(user_id,name) values ('00000000-0000-0000-0000-000000000001','Existing A'),('00000000-0000-0000-0000-000000000002','Existing B');
create temp table policies_before as select * from pg_policies where tablename='habits';
\ir ../../supabase_habit_targets.sql
update habits set target_percentage=40 where id=1;
\ir ../../supabase_habit_targets.sql
DO $$ begin
 if (select count(*) from habits)<>2 or (select target_percentage from habits where id=1)<>40 or (select target_percentage from habits where id=2) is not null then raise exception 'Data preservation failed'; end if;
 if exists ((select * from policies_before except select * from pg_policies where tablename='habits') union (select * from pg_policies where tablename='habits' except select * from policies_before)) then raise exception 'Policies changed'; end if;
 if not (select relrowsecurity from pg_class where oid='habits'::regclass) then raise exception 'RLS disabled'; end if;
end $$;
grant select,insert,update,delete on habits to authenticated;
grant usage,select on all sequences in schema public to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $$ declare n integer; begin
 if (select count(*) from habits)<>1 then raise exception 'Read isolation failed'; end if;
 update habits set target_percentage=99 where id=2; get diagnostics n=row_count;
 if n<>0 then raise exception 'Write isolation failed'; end if;
 begin insert into habits(user_id,name,target_percentage) values ('00000000-0000-0000-0000-000000000002','Attack',50); raise exception 'Insert isolation failed'; exception when insufficient_privilege then null; end;
 insert into habits(user_id,name,target_percentage) values (auth.uid(),'New A',0);
 update habits set target_percentage=100 where name='New A';
 if (select target_percentage from habits where name='New A')<>100 then raise exception 'Update failed'; end if;
 update habits set target_percentage=null where name='New A';
 if (select target_percentage from habits where name='New A') is not null then raise exception 'Removal failed'; end if;
 begin update habits set target_percentage=-1; raise exception 'Lower bound failed'; exception when check_violation then null; end;
 begin update habits set target_percentage=101; raise exception 'Upper bound failed'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
DO $$ begin if (select count(*) from habits)<>1 then raise exception 'B isolation failed'; end if; end $$;
reset role;
select 'PASS: repeat migration, data, policies, RLS, null/0/100, range, two users' as result;
