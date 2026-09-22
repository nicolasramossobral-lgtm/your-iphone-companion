-- Access control reset and approval workflow
-- Executed against Supabase project flvlopkobywrnttkeedj.

delete from public.user_roles;
delete from public.profiles;
delete from auth.users;

create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create unique index if not exists signup_requests_pending_email_idx
  on public.signup_requests (lower(email))
  where status = 'pending';

alter table public.signup_requests enable row level security;

drop policy if exists "Public can request access" on public.signup_requests;
create policy "Public can request access" on public.signup_requests
  for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Admins manage signup requests" on public.signup_requests;
create policy "Admins manage signup requests" on public.signup_requests
  for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  ));

drop policy if exists "Admins update signup requests" on public.signup_requests;
create policy "Admins update signup requests" on public.signup_requests
  for update to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  ));

grant insert on public.signup_requests to anon, authenticated;
grant select, update, delete on public.signup_requests to authenticated;
