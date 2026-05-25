-- SQL Schema for nd-shop Supabase Migration

-- 1. Create Profiles Table (extends the Supabase Auth Users table)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique,
  phone text unique,
  first_name text,
  middle_name text,
  last_name text,
  address text,
  state text,
  lga text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security for profiles
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Create Products Table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric default 0,
  unit text default 'per unit',
  payout_rate numeric,
  image_data text,
  is_new_stock boolean default false,
  is_old_stock boolean default false,
  is_custom boolean default false,
  is_special boolean default false,
  is_flexible boolean default false,
  cleared boolean default false,
  is_deleted boolean default false,
  is_hidden boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security for products
alter table public.products enable row level security;

create policy "Products are viewable by everyone." on public.products
  for select using (true);

-- (Admin policies would be added here in the future)

-- 3. Create Payouts Table
create table if not exists public.payouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  status text default 'pending', -- pending, completed, rejected
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payouts enable row level security;

create policy "Users can view their own payouts." on public.payouts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own payouts." on public.payouts
  for insert with check (auth.uid() = user_id);

-- 4. Create Community Messages Table
create table if not exists public.community_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.community_messages enable row level security;

create policy "Community messages are viewable by everyone." on public.community_messages
  for select using (true);

create policy "Authenticated users can insert community messages." on public.community_messages
  for insert with check (auth.role() = 'authenticated');
