-- Minimal RLS repair for habit yes/no tracking.
-- Run in Supabase SQL Editor for project App Universal.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.habit_checks to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;

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
