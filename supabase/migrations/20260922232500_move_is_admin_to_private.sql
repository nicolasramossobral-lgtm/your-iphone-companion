-- Keep the existing admin-check logic, but move the SECURITY DEFINER helper
-- out of the exposed public schema so it cannot be called through the Data API.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$function$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

do $$
declare
  policy_row record;
  using_expression text;
  check_expression text;
  statement text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%is_admin()%'
        or coalesce(with_check, '') like '%is_admin()%'
      )
  loop
    using_expression := replace(policy_row.qual, 'is_admin()', '(select private.is_admin())');
    check_expression := replace(policy_row.with_check, 'is_admin()', '(select private.is_admin())');

    statement := format(
      'alter policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

    if policy_row.qual is not null then
      statement := statement || format(' using (%s)', using_expression);
    end if;

    if policy_row.with_check is not null then
      statement := statement || format(' with check (%s)', check_expression);
    end if;

    execute statement;
  end loop;
end
$$;

drop function public.is_admin();
