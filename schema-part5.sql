-- SQL Schema Part 5: Global Sync Bridge

-- Create a table to securely sync all localStorage state
create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.app_state enable row level security;

-- For now, allow authenticated users to read and update the app state
-- In a true production environment, you would restrict this so only Admins can write to certain keys.
create policy "Authenticated users can select app_state" on public.app_state
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert/update app_state" on public.app_state
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Enable realtime for app_state
alter publication supabase_realtime add table public.app_state;
