-- Stickback: problems stay open for replies one week, and phones that get push notifications
-- Run in Supabase → SQL Editor after 0005.

-- ───────────────────────── One week to reply ─────────────────────────
-- After 7 days a problem is closed: it stays visible on profiles, but nobody can reply anymore.
create or replace function public.can_reply_to(pid bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.problems p
    where p.id = pid
      and not p.hidden
      and not public.is_blocked_pair(p.author_id)
      and p.created_at > now() - interval '7 days'
  );
$$;

-- The feed shows only problems that are still open
create or replace function public.feed_for_you(cat text default null, langs text[] default null, lim int default 40, skip int default 0)
returns table (id bigint, score double precision)
language sql
stable
set search_path = ''
as $$
  with base as (
    select p.id, p.created_at,
      (select count(*) from public.problem_stars s where s.problem_id = p.id) as stars,
      (select count(*) from public.replies r where r.problem_id = p.id) as replies
    from public.problems p
    where (cat is null or p.category = cat)
      and (langs is null or p.lang = any (langs))
      and p.created_at > now() - interval '7 days'
  )
  select id,
    ( 1.0
      + ln(1 + stars) * 1.2
      + case when replies = 0 then 2.0 when replies < 3 then 1.2 else 0 end
    ) / power(extract(epoch from now() - created_at) / 3600.0 + 2, 0.8) as score
  from base
  order by score desc, id desc
  limit lim offset skip;
$$;

-- ───────────────────────── Push notifications ─────────────────────────
-- One row per phone. The app saves its Expo push token here after you allow notifications.
create table public.push_tokens (
  token text primary key check (token like 'ExponentPushToken[%' or token like 'ExpoPushToken[%'),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lang text not null default 'it' check (lang in ('it', 'en', 'de', 'fr')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;

create policy "You see your own phones" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "You register your own phones" on public.push_tokens
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "You update your own phones" on public.push_tokens
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "You remove your own phones" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.push_tokens to authenticated;
grant update (lang, updated_at, user_id) on public.push_tokens to authenticated;

-- A phone that moves to another account (log out, log in as someone else) changes owner.
-- Security definer: the old owner's row is not visible to the new one.
create function public.register_push_token(tok text, lng text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, lang, updated_at)
  values (tok, auth.uid(), lng, now())
  on conflict (token) do update set user_id = auth.uid(), lang = excluded.lang, updated_at = now();
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- So the same reply never notifies twice
alter table public.replies add column notified_at timestamptz;
