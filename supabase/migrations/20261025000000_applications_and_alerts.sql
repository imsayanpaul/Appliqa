-- Tracker: when each application was sent, when its status last changed,
-- follow-ups sent, which job board it came from, and a copy of the resume used.
alter table public.saved_jobs add column if not exists applied_at timestamptz;
alter table public.saved_jobs add column if not exists status_updated_at timestamptz;
alter table public.saved_jobs add column if not exists follow_up_count integer not null default 0;
alter table public.saved_jobs add column if not exists last_follow_up_at timestamptz;
alter table public.saved_jobs add column if not exists source text;
alter table public.saved_jobs add column if not exists resume_snapshot jsonb;

-- Existing applications: the best guess for "applied on" is when they were saved
update public.saved_jobs
   set applied_at = coalesce(applied_at, created_at),
       status_updated_at = coalesce(status_updated_at, created_at)
 where status in ('applied', 'interview', 'offer', 'rejected');

-- Profile: deal-breakers ("service bond", "night shifts", ...) and daily job alert emails
alter table public.profiles add column if not exists deal_breakers text[] not null default '{}';
alter table public.profiles add column if not exists job_alerts boolean not null default false;
alter table public.profiles add column if not exists alerts_last_sent_at timestamptz;
-- The city the home feed searches in, so the alert email (sent without a browser) can use it too
alter table public.profiles add column if not exists alert_city text;
