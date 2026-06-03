-- App Universal RLS repair
-- Run this once in Supabase SQL Editor if the Security Advisor warning was resolved
-- manually or the app starts failing with row-level security / permission errors.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.weights to authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.habit_checks to authenticated;
grant select, insert, update, delete on table public.medications to authenticated;
grant select, insert, update, delete on table public.medication_plans to authenticated;
grant select, insert, update, delete on table public.medication_intakes to authenticated;
grant select, insert, update, delete on table public.weekly_reports to authenticated;

grant usage, select on all sequences in schema public to authenticated;

alter table public.weights enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;
alter table public.medications enable row level security;
alter table public.medication_plans enable row level security;
alter table public.medication_intakes enable row level security;
alter table public.weekly_reports enable row level security;

drop policy if exists weights_select_own on public.weights;
create policy weights_select_own
on public.weights
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists weights_insert_own on public.weights;
create policy weights_insert_own
on public.weights
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists weights_update_own on public.weights;
create policy weights_update_own
on public.weights
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists weights_delete_own on public.weights;
create policy weights_delete_own
on public.weights
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists habits_select_own on public.habits;
create policy habits_select_own
on public.habits
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists habits_insert_own on public.habits;
create policy habits_insert_own
on public.habits
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists habits_update_own on public.habits;
create policy habits_update_own
on public.habits
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists habits_delete_own on public.habits;
create policy habits_delete_own
on public.habits
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists habit_checks_select_own on public.habit_checks;
create policy habit_checks_select_own
on public.habit_checks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists habit_checks_insert_own on public.habit_checks;
create policy habit_checks_insert_own
on public.habit_checks
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.habits h
    where h.id = habit_id
      and h.user_id = auth.uid()
  )
);

drop policy if exists habit_checks_update_own on public.habit_checks;
create policy habit_checks_update_own
on public.habit_checks
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.habits h
    where h.id = habit_id
      and h.user_id = auth.uid()
  )
);

drop policy if exists habit_checks_delete_own on public.habit_checks;
create policy habit_checks_delete_own
on public.habit_checks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists medications_select_own on public.medications;
create policy medications_select_own
on public.medications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists medications_insert_own on public.medications;
create policy medications_insert_own
on public.medications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists medications_update_own on public.medications;
create policy medications_update_own
on public.medications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists medications_delete_own on public.medications;
create policy medications_delete_own
on public.medications
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists medication_plans_select_own on public.medication_plans;
create policy medication_plans_select_own
on public.medication_plans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists medication_plans_insert_own on public.medication_plans;
create policy medication_plans_insert_own
on public.medication_plans
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.medications m
    where m.id = medication_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists medication_plans_update_own on public.medication_plans;
create policy medication_plans_update_own
on public.medication_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.medications m
    where m.id = medication_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists medication_plans_delete_own on public.medication_plans;
create policy medication_plans_delete_own
on public.medication_plans
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists medication_intakes_select_own on public.medication_intakes;
create policy medication_intakes_select_own
on public.medication_intakes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists medication_intakes_insert_own on public.medication_intakes;
create policy medication_intakes_insert_own
on public.medication_intakes
for insert
to authenticated
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

drop policy if exists medication_intakes_update_own on public.medication_intakes;
create policy medication_intakes_update_own
on public.medication_intakes
for update
to authenticated
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

drop policy if exists medication_intakes_delete_own on public.medication_intakes;
create policy medication_intakes_delete_own
on public.medication_intakes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists weekly_reports_select_own on public.weekly_reports;
create policy weekly_reports_select_own
on public.weekly_reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists weekly_reports_insert_own on public.weekly_reports;
create policy weekly_reports_insert_own
on public.weekly_reports
for insert
to authenticated
with check (auth.uid() = user_id);
