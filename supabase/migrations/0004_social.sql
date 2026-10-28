-- Stickback: categories and the ranked feed
-- Run in Supabase → SQL Editor after 0001–0003.

-- ───────────────────────── Categories ─────────────────────────
alter table public.problems
  add column category text not null default 'altro'
  check (category in ('scuola', 'lavoro', 'famiglia', 'amore', 'amici', 'altro'));
create index problems_category on public.problems (category, created_at desc);

-- ───────────────────────── Feed ─────────────────────────
-- One feed for everyone: a score that mixes freshness, stars and problems that still need replies,
-- so new posts get a chance to be answered. Runs with your permissions, so hidden and blocked content stays out.
create function public.feed_for_you(cat text default null, lim int default 40, skip int default 0)
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
      and p.created_at > now() - interval '30 days'
  )
  select id,
    ( 1.0
      + ln(1 + stars) * 1.2
      + case when replies = 0 then 2.0 when replies < 3 then 1.2 else 0 end
    ) / power(extract(epoch from now() - created_at) / 3600.0 + 2, 0.8) as score
  from base
  order by score desc
  limit lim offset skip;
$$;

revoke execute on function public.feed_for_you(text, int, int) from public, anon;
grant execute on function public.feed_for_you(text, int, int) to authenticated;
