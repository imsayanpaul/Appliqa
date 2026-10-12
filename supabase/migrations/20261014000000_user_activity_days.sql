-- Seconds each user had Appliqa open and visible, per day (from a once-a-minute heartbeat).
-- Written only by the API server (service role); clients have no access.

create table if not exists public.user_activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  seconds integer not null default 0,
  last_beat_at timestamptz,
  primary key (user_id, day)
);

create index if not exists user_activity_days_day_idx on public.user_activity_days (day);

alter table public.user_activity_days enable row level security;
-- No RLS policies on purpose: anon/authenticated clients get no access.
