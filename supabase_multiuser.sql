-- Multi-user hardening and legacy migration helpers.
-- Run after:
--   1) supabase_weights.sql
--   2) supabase_habits.sql
--   3) supabase_medications.sql
--   4) supabase_weekly_reports.sql
--
-- Optional for legacy single-user rows:
-- select set_config('app.legacy_owner_user_id', '<AUTH_USER_UUID>', false);

alter table if exists public.habits add column if not exists user_id uuid;
alter table if exists public.habit_checks add column if not exists user_id uuid;
alter table if exists public.medications add column if not exists user_id uuid;
alter table if exists public.medication_plans add column if not exists user_id uuid;
alter table if exists public.medication_intakes add column if not exists user_id uuid;
alter table if exists public.weekly_reports add column if not exists user_id uuid;

do $$
declare
  v_owner_user_id uuid;
  v_auth_user_count integer;
begin
  begin
    v_owner_user_id := nullif(current_setting('app.legacy_owner_user_id', true), '')::uuid;
  exception
    when others then v_owner_user_id := null;
  end;

  select count(*)
  into v_auth_user_count
  from auth.users;

  if v_owner_user_id is null and v_auth_user_count = 1 then
    select id
    into v_owner_user_id
    from auth.users
    order by created_at asc, id asc
    limit 1;
  end if;

  if v_owner_user_id is null and (
    exists (select 1 from public.habits where user_id is null)
    or exists (select 1 from public.habit_checks where user_id is null)
    or exists (select 1 from public.medications where user_id is null)
    or exists (select 1 from public.medication_plans where user_id is null)
    or exists (select 1 from public.medication_intakes where user_id is null)
    or exists (select 1 from public.weekly_reports where user_id is null)
  ) then
    raise exception
      'Hay filas legacy sin user_id y no se ha podido resolver un unico usuario propietario. Define app.legacy_owner_user_id antes de continuar.';
  end if;

  update public.habits
  set user_id = v_owner_user_id
  where user_id is null;

  update public.habit_checks hc
  set user_id = h.user_id
  from public.habits h
  where hc.user_id is null
    and h.id = hc.habit_id;

  update public.habit_checks
  set user_id = v_owner_user_id
  where user_id is null;

  update public.medications
  set user_id = v_owner_user_id
  where user_id is null;

  update public.medication_plans p
  set user_id = m.user_id
  from public.medications m
  where p.user_id is null
    and m.id = p.medication_id;

  update public.medication_plans
  set user_id = v_owner_user_id
  where user_id is null;

  update public.medication_intakes i
  set user_id = p.user_id
  from public.medication_plans p
  where i.user_id is null
    and i.plan_id = p.id;

  update public.medication_intakes i
  set user_id = m.user_id
  from public.medications m
  where i.user_id is null
    and i.medication_id = m.id;

  update public.medication_intakes
  set user_id = v_owner_user_id
  where user_id is null;

  update public.weekly_reports
  set user_id = v_owner_user_id
  where user_id is null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'habits_user_id_fkey'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'habit_checks_user_id_fkey'
      and conrelid = 'public.habit_checks'::regclass
  ) then
    alter table public.habit_checks
      add constraint habit_checks_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'medications_user_id_fkey'
      and conrelid = 'public.medications'::regclass
  ) then
    alter table public.medications
      add constraint medications_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'medication_plans_user_id_fkey'
      and conrelid = 'public.medication_plans'::regclass
  ) then
    alter table public.medication_plans
      add constraint medication_plans_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'medication_intakes_user_id_fkey'
      and conrelid = 'public.medication_intakes'::regclass
  ) then
    alter table public.medication_intakes
      add constraint medication_intakes_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'weekly_reports_user_id_fkey'
      and conrelid = 'public.weekly_reports'::regclass
  ) then
    alter table public.weekly_reports
      add constraint weekly_reports_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end
$$;

alter table if exists public.habits alter column user_id set not null;
alter table if exists public.habit_checks alter column user_id set not null;
alter table if exists public.medications alter column user_id set not null;
alter table if exists public.medication_plans alter column user_id set not null;
alter table if exists public.medication_intakes alter column user_id set not null;
alter table if exists public.weekly_reports alter column user_id set not null;

alter table if exists public.habits enable row level security;
alter table if exists public.habit_checks enable row level security;
alter table if exists public.medications enable row level security;
alter table if exists public.medication_plans enable row level security;
alter table if exists public.medication_intakes enable row level security;
alter table if exists public.weekly_reports enable row level security;

drop policy if exists medication_intakes_update_own on public.medication_intakes;
create policy medication_intakes_update_own
on public.medication_intakes
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.medications m
    where m.id = medication_id
      and m.user_id = auth.uid()
  )
  and (
    plan_id is null
    or exists (
      select 1
      from public.medication_plans p
      where p.id = plan_id
        and p.user_id = auth.uid()
    )
  )
);

revoke all on function public.build_weekly_report_payload(uuid, date, date, text) from public, anon, authenticated;
revoke all on function public.build_weekly_report_summary(jsonb) from public, anon, authenticated;
revoke all on function public.generate_weekly_report_for_user(uuid, date, date, boolean, text) from public, anon, authenticated;
revoke all on function public.generate_due_weekly_reports(boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.run_weekly_reports_scheduler() from public, anon, authenticated;
revoke all on function public.generate_weekly_report_now(boolean) from public, anon;
revoke all on function public.weekly_report_period(timestamptz, text) from public, anon;
grant execute on function public.generate_weekly_report_now(boolean) to authenticated;
grant execute on function public.weekly_report_period(timestamptz, text) to authenticated;
