begin;

-- Run before deploying the habit-targets frontend. Existing habits keep no target.
-- Existing habits RLS policies also protect this column; no new grants required.
alter table public.habits
  add column if not exists target_percentage smallint;

alter table public.habits drop constraint if exists habits_target_percentage_check;
alter table public.habits add constraint habits_target_percentage_check
  check (target_percentage is null or target_percentage between 0 and 100);

commit;
