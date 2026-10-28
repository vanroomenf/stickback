-- Stickback: automatic filter for images and text
-- Run in Supabase → SQL Editor AFTER deploying the Edge Function "moderate"
-- (supabase/functions/moderate/index.ts) and adding the OPENAI_API_KEY secret.

-- Remember what the filter already checked
alter table public.problems add column moderated_at timestamptz;
alter table public.replies add column moderated_at timestamptz;
alter table public.saved_stickers add column moderated_at timestamptz;

-- Reports can now also come from the automatic filter (no person behind them)
alter table public.reports alter column reporter_id drop not null;
alter table public.reports add column source text not null default 'utente' check (source in ('utente', 'filtro'));

-- The moderators' queue shows where each report comes from
create or replace view moderation.queue as
select
  r.id as report_id,
  r.created_at,
  r.reason,
  r.details,
  r.status,
  coalesce(rep.username, 'filtro automatico') as reported_by,
  usr.username as reported_user,
  coalesce(rp.caption, p.text) as content,
  rp.sticker ->> 'v' as sticker_url,
  r.problem_id,
  r.reply_id,
  coalesce(rp.hidden, p.hidden) as already_hidden,
  (select count(*) from public.reports r2
     where (r.reply_id is not null and r2.reply_id = r.reply_id)
        or (r.reply_id is null and r.problem_id is not null and r2.problem_id = r.problem_id)) as total_reports,
  r.source
from public.reports r
left join public.profiles rep on rep.id = r.reporter_id
left join public.profiles usr on usr.id = r.reported_user_id
left join public.replies rp on rp.id = r.reply_id
left join public.problems p on p.id = r.problem_id
order by (r.status = 'aperta') desc, r.created_at;

-- Call the filter after every new problem, reply and saved sticker.
-- pg_net sends the request in the background, so posting stays instant.
create extension if not exists pg_net with schema extensions;

create function public.request_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://yrneksnnvjrwtyuvltli.supabase.co/functions/v1/moderate',
    body := jsonb_build_object('table', tg_table_name, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;
revoke execute on function public.request_moderation() from public, anon, authenticated;

create trigger problems_moderate after insert on public.problems
  for each row execute function public.request_moderation();
create trigger replies_moderate after insert on public.replies
  for each row execute function public.request_moderation();
create trigger saved_stickers_moderate after insert on public.saved_stickers
  for each row execute function public.request_moderation();
