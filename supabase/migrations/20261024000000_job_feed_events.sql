-- What each person's "for you" feed has shown them ('seen') and what they hid
-- with "Not interested" ('dismissed'). Lets the feed mark jobs as new and never
-- show a hidden one again. Written only by the API server (service role).

create table if not exists public.job_feed_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id text not null,
  kind text not null check (kind in ('seen', 'dismissed')),
  created_at timestamptz not null default now(),
  primary key (user_id, job_id, kind)
);

create index if not exists job_feed_events_user_kind_idx on public.job_feed_events (user_id, kind);

alter table public.job_feed_events enable row level security;
-- No RLS policies on purpose: anon/authenticated clients get no access.
