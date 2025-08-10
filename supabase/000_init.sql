-- AI services catalog
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  slug text unique not null,
  api_url text
);

-- Review requests
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  service_id uuid references services,
  subscription_id uuid,
  file_path text,
  status text default 'queued',
  result_json jsonb,
  created_at timestamptz default now()
);

-- Plans / subscriptions
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text,
  price_cents int,
  currency text default 'EUR',
  monthly_quota int,
  trial_days int default 0
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  plan_id uuid references plans,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  usage_this_period    int default 0,
  status text default 'trialing'
);

-- Billing events (Stripe)
create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_type text,
  amount_cents int,
  created_at timestamptz default now(),
  raw jsonb
);

-- RLS
alter table requests enable row level security;
create policy "user owns requests" on requests
  for all using ( user_id = auth.uid() );

alter table subscriptions enable row level security;
create policy "user owns subscription" on subscriptions
  for select using ( user_id = auth.uid() );
