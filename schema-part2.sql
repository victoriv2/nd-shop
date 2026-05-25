-- SQL Schema Part 2 for nd-shop Migration

-- 5. Create Sales Table (replaces nd_sales_history)
create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.profiles(id) not null,
  item text not null,
  price numeric,
  unit_price numeric,
  qty integer default 1,
  unit text,
  payout numeric default 0,
  is_flexible boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sales enable row level security;

create policy "Users can view their own sales." on public.sales
  for select using (auth.uid() = customer_id);

-- 6. Create Requests Table (replaces nd_requests_data)
create table if not exists public.requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  items jsonb not null,
  order_total numeric not null,
  status text default 'Pending',
  is_reward_purchase boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.requests enable row level security;

create policy "Users can view their own requests." on public.requests
  for select using (auth.uid() = user_id);

create policy "Users can insert their own requests." on public.requests
  for insert with check (auth.uid() = user_id);
