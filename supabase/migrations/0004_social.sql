-- Stickback: following people, categories, the "Per te" / "Amici" feeds and the weekly leaderboard
-- Run in Supabase → SQL Editor after 0001–0003.

-- ───────────────────────── Categories ─────────────────────────
alter table public.problems
  add column category text not null default 'altro'
  check (category in ('scuola', 'lavoro', 'famiglia', 'amore', 'amici', 'altro'));
create index problems_category on public.problems (category, created_at desc);

-- ───────────────────────── Following ─────────────────────────
create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id);

alter table public.follows enable row level security;
create policy "Follows are visible to signed-in users" on public.follows
  for select to authenticated using (true);
create policy "You can follow as yourself" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked_pair(followee_id));
create policy "You can unfollow" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));
grant select, insert, delete on public.follows to authenticated;

-- Blocking someone also removes the follows between you
create function public.blocks_unfollow()
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
create trigger blocks_unfollow after insert on public.blocks
  for each row execute function public.blocks_unfollow();

-- ───────────────────────── Feeds ─────────────────────────
-- "Per te": a score that mixes freshness, stars, problems that still need replies,
-- and people you follow. Runs with your permissions, so hidden and blocked content stays out.
create function public.feed_for_you(cat text default null, lim int default 40, skip int default 0)
returns table (id bigint, score double precision)
language sql
stable
set search_path = ''
as $$
  with base as (
    select p.id, p.created_at, p.author_id,
      (select count(*) from public.problem_stars s where s.problem_id = p.id) as stars,
      (select count(*) from public.replies r where r.problem_id = p.id) as replies,
      exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.author_id) as followed
    from public.problems p
    where (cat is null or p.category = cat)
      and p.created_at > now() - interval '30 days'
  )
  select id,
    ( 1.0
      + ln(1 + stars) * 1.2
      + case when replies = 0 then 2.0 when replies < 3 then 1.2 else 0 end   -- give new problems a chance to get replies
      + case when followed then 1.5 else 0 end
    ) / power(extract(epoch from now() - created_at) / 3600.0 + 2, 0.8) as score
  from base
  order by score desc
  limit lim offset skip;
$$;

-- "Amici": newest problems from the people you follow
create function public.feed_friends(cat text default null, lim int default 40, skip int default 0)
returns table (id bigint, score double precision)
language sql
stable
set search_path = ''
as $$
  select p.id, extract(epoch from p.created_at)::double precision as score
  from public.problems p
  join public.follows f on f.followee_id = p.author_id and f.follower_id = (select auth.uid())
  where (cat is null or p.category = cat)
  order by p.created_at desc
  limit lim offset skip;
$$;

-- ───────────────────────── Weekly leaderboard ─────────────────────────
-- Who collected the most stars on their replies in the last 7 days
create function public.leaderboard_week(lim int default 20)
returns table (user_id uuid, username text, name text, stars bigint, replies bigint)
language sql
stable
set search_path = ''
as $$
  select pr.id, pr.username, pr.name, count(*) as stars, count(distinct r.id) as replies
  from public.reply_stars s
  join public.replies r on r.id = s.reply_id
  join public.profiles pr on pr.id = r.author_id
  where s.created_at > now() - interval '7 days'
    and s.user_id <> r.author_id               -- your own stars don't count
    and not pr.banned
  group by pr.id, pr.username, pr.name
  order by stars desc, replies desc
  limit lim;
$$;

-- ───────────────────────── Profile counters ─────────────────────────
create function public.profile_counts(uid uuid)
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

revoke execute on function public.feed_for_you(text, int, int), public.feed_friends(text, int, int),
  public.leaderboard_week(int), public.profile_counts(uuid), public.blocks_unfollow() from public, anon;
grant execute on function public.feed_for_you(text, int, int), public.feed_friends(text, int, int),
  public.leaderboard_week(int), public.profile_counts(uuid) to authenticated;
