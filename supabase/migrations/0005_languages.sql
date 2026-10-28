-- Stickback: every problem has a language, and the feed shows the problems in your languages
-- Run in Supabase → SQL Editor after 0004.

-- Problems posted so far were all in Italian
alter table public.problems
  add column lang text not null default 'it'
  check (lang in ('it', 'en', 'de', 'fr'));
create index problems_lang on public.problems (lang, created_at desc);

-- The feed now takes the languages to show (null = all of them)
drop function if exists public.feed_for_you(text, int, int);

create function public.feed_for_you(cat text default null, langs text[] default null, lim int default 40, skip int default 0)
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

revoke execute on function public.feed_for_you(text, text[], int, int) from public, anon;
grant execute on function public.feed_for_you(text, text[], int, int) to authenticated;
