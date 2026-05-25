-- SQL Schema Part 3 for nd-shop Migration

-- 7. Create Direct Messages Table (replaces nd_messages)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  text text not null,
  is_read boolean default false,
  reply_to text,
  is_admin_broadcast boolean default false,
  broadcast_title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

-- Users can view messages they sent or received
create policy "Users can view their own messages." on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can insert messages if they are the sender
create policy "Users can insert their own messages." on public.messages
  for insert with check (auth.uid() = sender_id);

-- 8. Enable Realtime on tables
alter publication supabase_realtime add table public.community_messages;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.sales;
alter publication supabase_realtime add table public.requests;
