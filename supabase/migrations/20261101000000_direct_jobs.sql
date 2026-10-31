-- Jobs fetched directly from company career feeds (Greenhouse, Lever, Ashby, SmartRecruiters).
-- Filled by the daily sync. A job that leaves its feed gets closed_at instead of being deleted.
-- Written and read only by the API server (service role); clients have no access.

create table if not exists public.direct_jobs (
  id text primary key,                  -- e.g. "lever:meesho:7d9af9b5-..."
  ats text not null,
  company_slug text not null,
  company text not null,
  title text not null,
  location text not null default '',
  remote boolean not null default false,
  description text not null default '',
  employment_type text not null default '',
  department text not null default '',
  apply_link text not null,
  date_posted timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  closed_at timestamptz,
  title_search tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(department, ''))
  ) stored,
  body_search tsvector generated always as (to_tsvector('english', coalesce(description, ''))) stored
);

create index if not exists direct_jobs_title_search_idx on public.direct_jobs using gin (title_search);
create index if not exists direct_jobs_body_search_idx on public.direct_jobs using gin (body_search);
create index if not exists direct_jobs_open_posted_idx on public.direct_jobs (date_posted desc) where closed_at is null;
create index if not exists direct_jobs_company_idx on public.direct_jobs (ats, company_slug);

alter table public.direct_jobs enable row level security;
-- No RLS policies on purpose: anon/authenticated clients get no access.
