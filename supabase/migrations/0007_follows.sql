-- Stickback: follow people whose problems you like, and a "Seguiti" feed with what they post
-- Run in Supabase → SQL Editor after 0006. Safe to run even if an older version of 0004 already created "follows".

-- ───────────────────────── Following ─────────────────────────
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee on public.follows (followee_id);

alter table public.follows enable row level security;
drop policy if exists "Follows are visible to signed-in users" on public.follows;
drop policy if exists "You can follow as yourself" on public.follows;
drop policy if exists "You can unfollow" on public.follows;
create policy "Follows are visible to signed-in users" on public.follows
  for select to authenticated using (true);
create policy "You can follow as yourself" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked_pair(followee_id));
create policy "You can unfollow" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));
grant select, insert, delete on public.follows to authenticated;

-- Blocking someone also removes the follows between you
create or replace function public.blocks_unfollow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists blocks_unfollow on public.blocks;
create trigger blocks_unfollow after insert on public.blocks
  for each row execute function public.blocks_unfollow();
revoke execute on function public.blocks_unfollow() from public, anon, authenticated;

-- ───────────────────────── Feeds ─────────────────────────
-- "Per te": same mix as before, plus a small boost for people you follow
create or replace function public.feed_for_you(cat text default null, langs text[] default null, lim int default 40, skip int default 0)
returns table (id bigint, score double precision)
language sql
stable
set search_path = ''
as $$
  with base as (
    select p.id, p.created_at,
      (select count(*) from public.problem_stars s where s.problem_id = p.id) as stars,
      (select count(*) from public.replies r where r.problem_id = p.id) as replies,
      exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.author_id) as followed
    from public.problems p
    where (cat is null or p.category = cat)
      and (langs is null or p.lang = any (langs))
      and p.created_at > now() - interval '7 days'
  )
  select id,
    ( 1.0
      + ln(1 + stars) * 1.2
      + case when replies = 0 then 2.0 when replies < 3 then 1.2 else 0 end
      + case when followed then 1.0 else 0 end
    ) / power(extract(epoch from now() - created_at) / 3600.0 + 2, 0.8) as score
  from base
  order by score desc, id desc
  limit lim offset skip;
$$;

-- "Seguiti": the newest problems of the people you follow, any language, last 30 days
-- (closed ones too: you can still read the replies)
drop function if exists public.feed_friends(text, int, int);
create or replace function public.feed_following(cat text default null, lim int default 40, skip int default 0)
returns table (id bigint, score double precision)
language sql
stable
set search_path = ''
as $$
  select p.id, extract(epoch from p.created_at)::double precision as score
  from public.problems p
  join public.follows f on f.followee_id = p.author_id and f.follower_id = (select auth.uid())
  where (cat is null or p.category = cat)
    and p.created_at > now() - interval '30 days'
  order by p.created_at desc, p.id desc
  limit lim offset skip;
$$;

-- ───────────────────────── Profile counters ─────────────────────────
create or replace function public.profile_counts(uid uuid)
returns table (followers bigint, following bigint, i_follow boolean)
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.follows where followee_id = uid),
    (select count(*) from public.follows where follower_id = uid),
    exists (select 1 from public.follows where follower_id = (select auth.uid()) and followee_id = uid);
$$;

revoke execute on function public.feed_for_you(text, text[], int, int), public.feed_following(text, int, int),
  public.profile_counts(uuid) from public, anon;
grant execute on function public.feed_for_you(text, text[], int, int), public.feed_following(text, int, int),
  public.profile_counts(uuid) to authenticated;
