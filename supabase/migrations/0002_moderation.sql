-- Stickback: safety and moderation
-- Run once in Supabase → SQL Editor → New query → paste everything → Run (after 0001_stickback.sql).
--
-- Adds: minimum age (16) and acceptance of the community rules, reports with automatic hiding,
-- blocking users, a filter for banned words, account deletion, and a review queue for moderators.

-- ───────────────────────── Profiles: rules accepted, banned ─────────────────────────
alter table public.profiles
  add column terms_accepted_at timestamptz,
  add column banned boolean not null default false;

-- Sign-up: the app checks the date of birth (16+) and the rules before creating the account,
-- and sends age_ok / terms in the metadata. Accounts created another way must accept in the app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  candidate text;
  accepted boolean := coalesce(new.raw_user_meta_data ->> 'age_ok', '') = 'true'
                      and coalesce(new.raw_user_meta_data ->> 'terms', '') <> '';
begin
  wanted := regexp_replace(wanted, '[^a-z0-9._]', '', 'g');
  if char_length(wanted) < 3 then
    wanted := 'utente';
  end if;
  wanted := left(wanted, 16);
  candidate := wanted;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := wanted || floor(random() * 1000)::int::text;
  end loop;
  insert into public.profiles (id, username, name, terms_accepted_at)
  values (new.id, candidate, left(coalesce(new.raw_user_meta_data ->> 'name', candidate), 30),
          case when accepted then now() end);
  return new;
end;
$$;

-- For accounts that still have to confirm age and rules (e.g. created before this update)
create function public.accept_terms(is_16_or_older boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not is_16_or_older then
    raise exception 'eta_minima';
  end if;
  update public.profiles set terms_accepted_at = now() where id = (select auth.uid());
end;
$$;

-- You can post only after accepting the rules, and not if a moderator banned you
create function public.can_post()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and terms_accepted_at is not null and not banned
  );
$$;

-- ───────────────────────── Blocking ─────────────────────────
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on public.blocks (blocked_id);

-- True when you blocked that person, or they blocked you: in both cases you don't see each other
create function public.is_blocked_pair(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = (select auth.uid()))
  );
$$;

alter table public.blocks enable row level security;
create policy "You see who you blocked" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "You can block someone" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "You can unblock" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));
grant select, insert, delete on public.blocks to authenticated;

-- ───────────────────────── Hidden content ─────────────────────────
-- Content hidden by reports or by a moderator stays visible only to its author
alter table public.problems add column hidden boolean not null default false;
alter table public.replies add column hidden boolean not null default false;

drop policy "Problems are visible to signed-in users" on public.problems;
create policy "Problems are visible unless hidden or blocked" on public.problems
  for select to authenticated
  using (author_id = (select auth.uid()) or (not hidden and not public.is_blocked_pair(author_id)));

drop policy "Replies are visible to signed-in users" on public.replies;
create policy "Replies are visible unless hidden or blocked" on public.replies
  for select to authenticated
  using (author_id = (select auth.uid()) or (not hidden and not public.is_blocked_pair(author_id)));

-- You can't reply to hidden problems or to people you blocked (or who blocked you).
-- Security definer: the check must see the problem even when the rules above hide it from you.
create function public.can_reply_to(pid bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.problems p
    where p.id = pid and not p.hidden and not public.is_blocked_pair(p.author_id)
  );
$$;

-- Posting requires accepted rules and no ban
drop policy "You can post problems as yourself" on public.problems;
create policy "You can post problems as yourself" on public.problems
  for insert to authenticated with check (author_id = (select auth.uid()) and public.can_post());

drop policy "You can reply as yourself" on public.replies;
create policy "You can reply as yourself" on public.replies
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_post() and public.can_reply_to(problem_id));

-- ───────────────────────── Reports ─────────────────────────
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  problem_id bigint references public.problems (id) on delete cascade,
  reply_id bigint references public.replies (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('bullismo', 'sessuale', 'odio', 'dati_personali', 'autolesionismo', 'spam', 'altro')),
  details text not null default '' check (char_length(details) <= 300),
  status text not null default 'aperta' check (status in ('aperta', 'risolta', 'respinta')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(problem_id, reply_id, reported_user_id) >= 1)
);
create unique index reports_once_per_problem on public.reports (reporter_id, problem_id) where problem_id is not null;
create unique index reports_once_per_reply on public.reports (reporter_id, reply_id) where reply_id is not null;
create index reports_open on public.reports (status, created_at);

-- Fill in who is being reported, so moderators see it at a glance
create function public.reports_fill_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reply_id is not null then
    select author_id into new.reported_user_id from public.replies where id = new.reply_id;
  elsif new.problem_id is not null then
    select author_id into new.reported_user_id from public.problems where id = new.problem_id;
  end if;
  return new;
end;
$$;
create trigger reports_fill_user before insert on public.reports
  for each row execute function public.reports_fill_user();

-- After 3 reports from different people, the content is hidden until a moderator checks it
create function public.reports_autohide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reply_id is not null and
     (select count(distinct reporter_id) from public.reports where reply_id = new.reply_id) >= 3 then
    update public.replies set hidden = true where id = new.reply_id;
  end if;
  if new.problem_id is not null and
     (select count(distinct reporter_id) from public.reports where problem_id = new.problem_id) >= 3 then
    update public.problems set hidden = true where id = new.problem_id;
  end if;
  return new;
end;
$$;
create trigger reports_autohide after insert on public.reports
  for each row execute function public.reports_autohide();

alter table public.reports enable row level security;
create policy "You see your own reports" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy "You can report" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
grant select, insert on public.reports to authenticated;

-- ───────────────────────── Banned words ─────────────────────────
-- Add or remove words in Table Editor → blocked_terms (lowercase, one word or phrase per row)
create table public.blocked_terms (term text primary key check (term = lower(term) and term ~ '^[a-zà-ü0-9 ]+$'));
alter table public.blocked_terms enable row level security; -- no policies: the app can't read the list

insert into public.blocked_terms (term) values
  ('negro'), ('negri'), ('frocio'), ('froci'), ('ricchione'), ('ricchioni'), ('mongoloide'),
  ('handicappato'), ('troia'), ('puttana'), ('zoccola'), ('suicidati'), ('ammazzati'), ('ucciditi'),
  ('nigger'), ('faggot'), ('retard'), ('kys'), ('kill yourself'), ('whore'), ('slut')
on conflict do nothing;

create function public.has_blocked_term(t text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocked_terms b
    where lower(coalesce(t, '')) ~ ('\m' || b.term || '\M')
  );
$$;

create function public.check_text()
returns trigger
language plpgsql
security definer -- reads the hidden word list on behalf of the person posting
set search_path = ''
as $$
declare
  bad boolean := false;
begin
  -- one branch per table: each table has different text columns
  if tg_table_name = 'problems' then
    bad := public.has_blocked_term(new.text);
  elsif tg_table_name = 'replies' then
    bad := public.has_blocked_term(new.caption);
  elsif tg_table_name = 'profiles' then
    bad := public.has_blocked_term(new.username) or public.has_blocked_term(new.name) or public.has_blocked_term(new.bio);
  end if;
  if bad then
    raise exception 'contenuto_non_ammesso';
  end if;
  return new;
end;
$$;
create trigger problems_check_text before insert on public.problems for each row execute function public.check_text();
create trigger replies_check_text before insert on public.replies for each row execute function public.check_text();
create trigger profiles_check_text before insert or update of username, name, bio on public.profiles for each row execute function public.check_text();

-- ───────────────────────── Delete your account ─────────────────────────
-- Removes the login and, through the foreign keys, profile, problems, replies, stars,
-- saved stickers, blocks and reports. The app deletes your uploaded images first.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.accept_terms(boolean), public.delete_my_account(),
  public.can_post(), public.is_blocked_pair(uuid), public.can_reply_to(bigint), public.has_blocked_term(text) from public, anon;
grant execute on function public.accept_terms(boolean), public.delete_my_account(),
  public.can_post(), public.is_blocked_pair(uuid), public.can_reply_to(bigint) to authenticated;

-- ───────────────────────── Moderators ─────────────────────────
-- Review queue, visible only in the Supabase dashboard (this schema is not exposed to the app).
-- To act: in Table Editor set problems.hidden / replies.hidden, set profiles.banned = true,
-- and set reports.status to 'risolta' or 'respinta'.
create schema if not exists moderation;
create view moderation.queue as
select
  r.id as report_id,
  r.created_at,
  r.reason,
  r.details,
  r.status,
  rep.username as reported_by,
  usr.username as reported_user,
  coalesce(rp.caption, p.text) as content,
  rp.sticker ->> 'v' as sticker_url,
  r.problem_id,
  r.reply_id,
  coalesce(rp.hidden, p.hidden) as already_hidden,
  (select count(*) from public.reports r2
     where (r.reply_id is not null and r2.reply_id = r.reply_id)
        or (r.reply_id is null and r.problem_id is not null and r2.problem_id = r.problem_id)) as total_reports
from public.reports r
left join public.profiles rep on rep.id = r.reporter_id
left join public.profiles usr on usr.id = r.reported_user_id
left join public.replies rp on rp.id = r.reply_id
left join public.problems p on p.id = r.problem_id
order by (r.status = 'aperta') desc, r.created_at;
revoke all on schema moderation from public, anon, authenticated;
