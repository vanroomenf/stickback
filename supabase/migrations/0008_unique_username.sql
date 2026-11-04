-- Stickback: a username that is taken is refused at sign-up, instead of quietly getting numbers added
-- Run in Supabase → SQL Editor after 0007.

-- The app asks this while you type, before creating the account (usernames are public anyway)
create or replace function public.username_available(wanted text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(wanted) ~ '^[a-z0-9._]{3,20}$'
     and not exists (select 1 from public.profiles p where p.username = lower(wanted));
$$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- New accounts: the username must be valid and free, otherwise the sign-up fails
-- (the app then says "this username is taken")
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  accepted boolean := coalesce(new.raw_user_meta_data ->> 'age_ok', '') = 'true'
                      and coalesce(new.raw_user_meta_data ->> 'terms', '') <> '';
begin
  if wanted !~ '^[a-z0-9._]{3,20}$' then
    raise exception 'username_invalid';
  end if;
  if exists (select 1 from public.profiles where username = wanted) then
    raise exception 'username_taken';
  end if;
  insert into public.profiles (id, username, name, terms_accepted_at)
  values (new.id, wanted, left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), wanted), 30),
          case when accepted then now() end);
  return new;
end;
$$;
