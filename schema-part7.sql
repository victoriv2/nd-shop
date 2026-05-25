-- SQL Schema Part 7: Database Security Lockdown (RBAC)

-- 1. Add the is_admin flag to the profiles table
alter table public.profiles add column if not exists is_admin boolean default false;

-- 2. Remove the old, open security policy from app_state
drop policy if exists "Authenticated users can insert/update app_state" on public.app_state;

-- 3. Create a strict policy: Admins can edit ANY key in app_state
create policy "Admins have full access to app_state" on public.app_state
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  ) with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- 4. Create a limited policy: Regular customers can ONLY submit orders and carts
create policy "Customers can only edit cart and requests" on public.app_state
  for all using (
    auth.role() = 'authenticated' and key in ('nd_requests_data', 'nd_user_cart_data')
  ) with check (
    auth.role() = 'authenticated' and key in ('nd_requests_data', 'nd_user_cart_data')
  );

-- =======================================================================
-- CRITICAL STEP: PROMOTING YOURSELF TO ADMIN
-- =======================================================================
-- Uncomment the line below (remove the '--') and replace the email with 
-- the exact email address you used to create your own account.
-- Then run this entire script!
--
-- update public.profiles set is_admin = true where email = 'admin@nd.shop';
