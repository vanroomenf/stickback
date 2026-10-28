-- Stickback: database schema
-- Run once in Supabase → SQL Editor → New query → paste everything → Run.
-- Every table has Row Level Security: people can read the community's content,
-- but only change what they created themselves.

-- ───────────────────────── Profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{3,20}$'),
  name text not null default '' check (char_length(name) <= 30),
  bio text not null default '' check (char_length(bio) <= 100),
  created_at timestamptz not null default now()
);

-- A profile is created automatically when someone signs up.
-- The app sends the chosen username in the sign-up metadata; if it is taken or invalid,
-- a free variant is used so sign-up never fails.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  candidate text;
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
  insert into public.profiles (id, username, name)
  values (new.id, candidate, left(coalesce(new.raw_user_meta_data ->> 'name', candidate), 30));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Problems and replies ─────────────────────────
create table public.problems (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 140),
  winner_reply_id bigint,
  created_at timestamptz not null default now()
);

create table public.replies (
  id bigint generated always as identity primary key,
  problem_id bigint not null,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  caption text not null check (char_length(caption) between 1 and 50),
  -- { "type": "img" | "gif", "v": url, "thumb": url, "giphy": bool }
  sticker jsonb not null check (sticker ? 'v' and sticker ->> 'type' in ('img', 'gif')),
  created_at timestamptz not null default now(),
  constraint replies_problem_id_fkey foreign key (problem_id) references public.problems (id) on delete cascade
);

alter table public.problems
  add constraint problems_winner_reply_id_fkey
  foreign key (winner_reply_id) references public.replies (id) on delete set null;

-- The "best reply" must be a reply to that same problem
create function public.check_winner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.winner_reply_id is not null and not exists (
    select 1 from public.replies r where r.id = new.winner_reply_id and r.problem_id = new.id
  ) then
    raise exception 'La risposta scelta non appartiene a questo problema';
  end if;
  return new;
end;
$$;

create trigger problems_check_winner
  before update of winner_reply_id on public.problems
  for each row execute function public.check_winner();

-- ───────────────────────── Stars ─────────────────────────
create table public.problem_stars (
  problem_id bigint not null references public.problems (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (problem_id, user_id)
);

create table public.reply_stars (
  reply_id bigint not null references public.replies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

-- ───────────────────────── Your sticker collection ─────────────────────────
create table public.saved_stickers (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sticker jsonb not null check (sticker ? 'v'),
  created_at timestamptz not null default now()
);
create unique index saved_stickers_user_v on public.saved_stickers (user_id, (sticker ->> 'v'));

-- ───────────────────────── Indexes ─────────────────────────
create index problems_created_at on public.problems (created_at desc);
create index problems_author on public.problems (author_id);
create index replies_problem on public.replies (problem_id);
create index replies_author on public.replies (author_id);
create index reply_stars_user on public.reply_stars (user_id);
create index problem_stars_user on public.problem_stars (user_id);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.replies enable row level security;
alter table public.problem_stars enable row level security;
alter table public.reply_stars enable row level security;
alter table public.saved_stickers enable row level security;

create policy "Profiles are visible to signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "You can edit your own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Problems are visible to signed-in users" on public.problems
  for select to authenticated using (true);
create policy "You can post problems as yourself" on public.problems
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "You can pick the best reply on your problems" on public.problems
  for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "You can delete your problems" on public.problems
  for delete to authenticated using (author_id = (select auth.uid()));

create policy "Replies are visible to signed-in users" on public.replies
  for select to authenticated using (true);
create policy "You can reply as yourself" on public.replies
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "You can delete your replies" on public.replies
  for delete to authenticated using (author_id = (select auth.uid()));

create policy "Problem stars are visible" on public.problem_stars
  for select to authenticated using (true);
create policy "You can star as yourself" on public.problem_stars
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "You can remove your stars" on public.problem_stars
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Reply stars are visible" on public.reply_stars
  for select to authenticated using (true);
create policy "You can star replies as yourself" on public.reply_stars
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "You can remove your reply stars" on public.reply_stars
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Only you see your sticker collection" on public.saved_stickers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "You can save stickers" on public.saved_stickers
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "You can remove your saved stickers" on public.saved_stickers
  for delete to authenticated using (user_id = (select auth.uid()));

-- New tables are not exposed automatically in this project, so grant exactly what the app needs.
-- Only signed-in users (role "authenticated") can use the app's data; logged-out visitors get nothing.
grant select on public.profiles, public.problems, public.replies,
  public.problem_stars, public.reply_stars, public.saved_stickers to authenticated;
grant insert on public.problems, public.replies, public.problem_stars,
  public.reply_stars, public.saved_stickers to authenticated;
grant delete on public.problems, public.replies, public.problem_stars,
  public.reply_stars, public.saved_stickers to authenticated;
-- Authors may only change which reply is the best one, not the text of the problem
grant update (winner_reply_id) on public.problems to authenticated;
grant update (username, name, bio) on public.profiles to authenticated;

-- ───────────────────────── Uploaded stickers (Storage) ─────────────────────────
-- Public bucket: sticker images can be shown to everyone; each person uploads only into their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 1048576, array['image/webp', 'image/png', 'image/gif', 'image/jpeg'])
on conflict (id) do nothing;

create policy "Upload stickers into your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete stickers from your own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────────────────── Realtime ─────────────────────────
-- New replies appear live in the app (Realtime respects the policies above)
alter publication supabase_realtime add table public.replies;
