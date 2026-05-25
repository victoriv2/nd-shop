-- SQL Schema Part 4: Messaging JSONB Support
-- Since the messaging logic uses complex nested objects (e.g. pinned states, read receipts, nested replies, polls), 
-- we will use a JSONB column to store the full message object to avoid breaking the frontend logic.

alter table public.community_messages
add column if not exists raw_data jsonb;

alter table public.messages
add column if not exists raw_data jsonb;
