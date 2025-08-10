-- core
create table services(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  slug text unique not null,
  api_url text
);

create table requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  service_id uuid references services,
  subscription_id uuid,
  company_id uuid,
  file_path text,
  status text default 'queued',
  result_json jsonb,
  ttl_at timestamptz,
  created_at timestamptz default now(),
  constraint status_check check (status in ('queued','running','done','error'))
);

create index on requests(user_id, created_at desc);
create index on requests(service_id);

-- billing
create table plans(
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text,
  price_cents int,
  currency text default 'EUR',
  monthly_quota int,
  trial_days int default 0
);

create table subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  plan_id uuid references plans,
  company_id uuid,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  usage_this_period    int default 0,
  status text default 'trialing',
  last_event_id text
);

create unique index on subscriptions(last_event_id);

create table billing_events(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_type text,
  amount_cents int,
  created_at timestamptz default now(),
  raw jsonb
);

-- org
create table companies(
  id uuid primary key default gen_random_uuid(),
  name text,
  domain text unique
);

-- rate limit
create table request_limits(
  user_id uuid primary key,
  tokens int default 60,
  last_refill timestamptz default now()
);

-- RLS
alter table requests enable row level security;
create policy "user_owns_requests" on requests
  for all using ( user_id = auth.uid() );

alter table subscriptions enable row level security;
create policy "user_owns_sub" on subscriptions
  for select using ( user_id = auth.uid() );
