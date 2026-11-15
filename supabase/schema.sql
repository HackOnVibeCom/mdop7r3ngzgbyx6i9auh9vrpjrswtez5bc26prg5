-- ChaloPlan — full schema. Paste into Supabase SQL editor and run once.
-- Safe to re-run: every object is created with "if not exists" / "drop ... if exists" guards.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('trip','movie','birthday','party','dinner','other')),
  mode text not null check (mode in ('trip','short')),
  title text not null,
  emoji text default '🎒',
  host_name text not null,
  host_device_id text not null,
  host_upi text,
  from_city text, from_lat float8, from_lon float8,
  days int default 1,
  budget_min int, budget_max int,
  deadline timestamptz,
  status text default 'voting' check (status in ('voting','locked','live','done')),
  final_date_option uuid, final_place_option uuid, final_movie_option uuid,
  final_budget int,
  meeting_point jsonb,           -- {name, lat, lon}
  ai_plan jsonb,                 -- reason, itinerary, cost_breakdown, packing_list, travel, ...
  details jsonb,                 -- places/stays/food/weather/safety merged data
  ai_recap jsonb,
  ref_plan_id uuid references plans(id),
  created_at timestamptz default now(),
  locked_at timestamptz
);

create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  kind text not null check (kind in ('date','place','movie')),
  label text not null,
  value text,                    -- ISO date / time slot / place name
  meta jsonb,                    -- distance_km, approx_cost_inr, why, lat, lon
  sort int default 0
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  name text not null,
  device_id text not null,
  area text, lat float8, lon float8,
  budget_vote int,
  comment text,
  upi_id text,
  has_voted boolean default false,
  checked_in boolean default false,
  created_at timestamptz default now(),
  unique (plan_id, device_id)
);

create table if not exists votes (
  option_id uuid references options(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  value text not null check (value in ('yes','maybe','no')),
  primary key (option_id, participant_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  title text not null,
  assignee_id uuid references participants(id),
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  paid_by uuid references participants(id),
  title text not null,
  category text default 'other',  -- travel | stay | food | tickets | other
  amount numeric not null check (amount > 0),
  created_at timestamptz default now()
);

create table if not exists expense_shares (
  expense_id uuid references expenses(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  primary key (expense_id, participant_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  from_id uuid references participants(id),
  to_id uuid references participants(id),
  amount numeric not null,
  status text default 'pending' check (status in ('pending','paid_cash','paid_upi','settled')),
  updated_at timestamptz default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  participant_id uuid references participants(id),
  photo_url text not null,
  created_at timestamptz default now()
);

create table if not exists place_cache (
  key text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

create table if not exists events (
  id bigserial primary key,
  plan_id uuid references plans(id) on delete set null,
  device_id text,
  type text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- indexes

create index if not exists options_plan_id_idx on options(plan_id);
create index if not exists participants_plan_id_idx on participants(plan_id);
create index if not exists tasks_plan_id_idx on tasks(plan_id);
create index if not exists expenses_plan_id_idx on expenses(plan_id);
create index if not exists settlements_plan_id_idx on settlements(plan_id);
create index if not exists memories_plan_id_idx on memories(plan_id);
create index if not exists events_type_created_idx on events(type, created_at);
create index if not exists plans_ref_plan_id_idx on plans(ref_plan_id);

-- ---------------------------------------------------------------- RLS
-- Hackathon model: no signup at all. Anyone holding a 6-char plan link may read it
-- and join/vote on it. Host-only writes (generate / lock / edit / delete) go through
-- the `host` edge function, which uses the service role key and checks host_device_id.
-- Known limitation (documented in the README): anon updates are not tied to a session,
-- so a determined visitor could edit another participant's row in the same plan.

alter table plans enable row level security;
alter table options enable row level security;
alter table participants enable row level security;
alter table votes enable row level security;
alter table tasks enable row level security;
alter table expenses enable row level security;
alter table expense_shares enable row level security;
alter table settlements enable row level security;
alter table memories enable row level security;
alter table place_cache enable row level security;
alter table events enable row level security;

do $$
declare
  t text;
  readable text[] := array[
    'plans','options','participants','votes','tasks','expenses',
    'expense_shares','settlements','memories','events'
  ];
  insertable text[] := array[
    'plans','options','participants','votes','tasks','expenses',
    'expense_shares','settlements','memories','events'
  ];
  updatable text[] := array[
    'participants','votes','tasks','settlements','expenses'
  ];
begin
  foreach t in array readable loop
    execute format('drop policy if exists anon_select on %I', t);
    execute format('create policy anon_select on %I for select to anon, authenticated using (true)', t);
  end loop;

  foreach t in array insertable loop
    execute format('drop policy if exists anon_insert on %I', t);
    execute format('create policy anon_insert on %I for insert to anon, authenticated with check (true)', t);
  end loop;

  foreach t in array updatable loop
    execute format('drop policy if exists anon_update on %I', t);
    execute format('create policy anon_update on %I for update to anon, authenticated using (true) with check (true)', t);
  end loop;

  -- A participant may remove their own vote (re-voting) and their own expense rows.
  execute 'drop policy if exists anon_delete on votes';
  execute 'create policy anon_delete on votes for delete to anon, authenticated using (true)';
  execute 'drop policy if exists anon_delete on expense_shares';
  execute 'create policy anon_delete on expense_shares for delete to anon, authenticated using (true)';
end
$$;

-- place_cache is written only by edge functions (service role bypasses RLS);
-- the browser may read it, which keeps repeat lookups cheap.
drop policy if exists anon_select on place_cache;
create policy anon_select on place_cache for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- realtime

do $$
declare
  t text;
begin
  foreach t in array array['participants','votes','tasks','expenses','settlements','memories','plans'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end
$$;

-- Realtime payloads need the full row to diff participant/vote changes.
alter table participants replica identity full;
alter table votes replica identity full;
alter table tasks replica identity full;
alter table expenses replica identity full;
alter table settlements replica identity full;

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = true;

drop policy if exists "memories public read" on storage.objects;
create policy "memories public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'memories');

drop policy if exists "memories anon upload" on storage.objects;
create policy "memories anon upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'memories');

-- ---------------------------------------------------------------- stats RPC

create or replace function get_stats()
returns json
language sql
security definer
set search_path = public
as $$
  with
  p as (select count(*)::int as total, count(ref_plan_id)::int as referred from plans),
  v as (select count(distinct device_id)::int as voters from participants),
  per as (
    select coalesce(avg(c), 0)::numeric(10,2) as avg_voters
    from (select count(*)::int as c from participants group by plan_id) s
  ),
  ev as (
    select
      count(*) filter (where type = 'plan_view')::int as views,
      count(*) filter (where type = 'cta_click')::int as cta_clicks,
      count(*) filter (where type = 'vote')::int as votes_logged
    from events
  ),
  lock as (
    select coalesce(avg(extract(epoch from (locked_at - created_at)) / 60), 0)::numeric(10,1) as avg_minutes
    from plans where locked_at is not null
  ),
  daily as (
    select json_agg(json_build_object('day', day, 'count', c) order by day) as series
    from (
      select date_trunc('day', created_at)::date as day, count(*)::int as c
      from plans
      where created_at > now() - interval '30 days'
      group by 1
    ) d
  )
  select json_build_object(
    'total_plans', p.total,
    'referred_plans', p.referred,
    'k_factor', case when p.total = 0 then 0 else round(p.referred::numeric / p.total, 3) end,
    'unique_voters', v.voters,
    'avg_voters_per_plan', per.avg_voters,
    'plan_views', ev.views,
    'cta_clicks', ev.cta_clicks,
    'cta_click_rate', case when ev.views = 0 then 0 else round(ev.cta_clicks::numeric / ev.views, 3) end,
    'votes_logged', ev.votes_logged,
    'avg_minutes_to_lock', lock.avg_minutes,
    'plans_per_day', coalesce(daily.series, '[]'::json)
  )
  from p, v, per, ev, lock, daily;
$$;

grant execute on function get_stats() to anon, authenticated;
