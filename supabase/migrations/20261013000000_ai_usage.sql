-- One row per Gemini call: who it was for, which feature, and the tokens it used.
-- Written only by the API server (service role); clients have no access.

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  feature text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_id_idx on public.ai_usage (user_id);
create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at);

alter table public.ai_usage enable row level security;
-- No RLS policies on purpose: anon/authenticated clients get no access.
