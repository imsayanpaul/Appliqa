-- Fixed-window rate limit counters shared by every API server instance.
-- Only the service role (the Express server) touches this table.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- No RLS policies on purpose: anon/authenticated clients get no access.

-- Atomically record one hit for p_key and return the window's running count.
-- Starts a fresh window when the previous one has expired.
create or replace function public.rate_limit_hit(p_key text, p_window_ms integer)
returns table (hit_count integer, window_reset timestamptz)
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update set
    count    = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then excluded.reset_at else r.reset_at end
  returning r.count, r.reset_at;
$$;

revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;
