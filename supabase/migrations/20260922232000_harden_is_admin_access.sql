-- Keep the existing is_admin() helper for RLS, but remove anonymous RPC access.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
