-- NAVigating Business - cloud saves schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: tables use IF NOT EXISTS, functions use CREATE OR REPLACE.
--
-- Security model:
--   * Tables have RLS enabled and NO policies, so the anon key cannot read
--     or write them directly. Every operation goes through a SECURITY DEFINER
--     function that validates a session token first.
--   * PINs are hashed with bcrypt (pgcrypto). Plain PINs are never stored.
--   * Repeated bad PINs lock a code for 15 minutes.
--
-- Note: pgcrypto may live in "public" or "extensions" depending on the
-- project. Functions therefore carry both on their search_path and call
-- crypt()/gen_salt() unqualified.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table if not exists public.players (
  code            text primary key check (code ~ '^[A-Z0-9]{2,12}$'),
  pin_hash        text not null,
  display_name    text,
  created_at      timestamptz not null default now(),
  failed_attempts integer not null default 0,
  locked_until    timestamptz
);

create table if not exists public.sessions (
  token      uuid primary key default gen_random_uuid(),
  code       text not null references public.players(code) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.saves (
  code       text not null references public.players(code) on delete cascade,
  slot       text not null,
  label      text,
  payload    text not null,
  company    text,
  month      integer,
  year       integer,
  cash       numeric,
  updated_at timestamptz not null default now(),
  primary key (code, slot)
);

create table if not exists public.scores (
  code         text primary key references public.players(code) on delete cascade,
  display_name text,
  company      text,
  score        numeric not null,
  month        integer,
  year         integer,
  updated_at   timestamptz not null default now()
);

alter table public.players  enable row level security;
alter table public.sessions enable row level security;
alter table public.saves    enable row level security;
alter table public.scores   enable row level security;

revoke all on public.players  from anon, authenticated;
revoke all on public.sessions from anon, authenticated;
revoke all on public.saves    from anon, authenticated;
revoke all on public.scores   from anon, authenticated;

-- ------------------------------------------------------------- internals

create or replace function public.nb_code_of(p_token uuid)
returns text language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text;
begin
  select code into v_code from sessions
   where token = p_token and expires_at > now();
  if v_code is null then raise exception 'Session expired. Sign in again.'; end if;
  return v_code;
end; $$;

-- ---------------------------------------------------------------- public

create or replace function public.nb_register(p_code text, p_pin text, p_name text default null)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text; v_token uuid;
begin
  v_code := upper(trim(p_code));
  if v_code !~ '^[A-Z0-9]{2,12}$' then
    raise exception 'Player code must be 2-12 letters or numbers.';
  end if;
  if p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must be 4-8 digits.';
  end if;
  if exists (select 1 from players where code = v_code) then
    raise exception 'That player code is taken. Pick another.';
  end if;
  insert into players (code, pin_hash, display_name)
  values (v_code, crypt(p_pin, gen_salt('bf')), coalesce(nullif(trim(p_name), ''), v_code));
  insert into sessions (code) values (v_code) returning token into v_token;
  return v_token;
end; $$;

create or replace function public.nb_login(p_code text, p_pin text)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_player players; v_token uuid;
begin
  select * into v_player from players where code = upper(trim(p_code));
  if v_player.code is null then raise exception 'No such player code.'; end if;
  if v_player.locked_until is not null and v_player.locked_until > now() then
    raise exception 'Too many wrong PINs. Try again in a few minutes.';
  end if;
  if v_player.pin_hash <> crypt(p_pin, v_player.pin_hash) then
    update players set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 8 then now() + interval '15 minutes' else locked_until end
     where code = v_player.code;
    raise exception 'Wrong PIN.';
  end if;
  update players set failed_attempts = 0, locked_until = null where code = v_player.code;
  insert into sessions (code) values (v_player.code) returning token into v_token;
  return v_token;
end; $$;

create or replace function public.nb_list_saves(p_token uuid)
returns table (slot text, label text, company text, month integer, year integer, cash numeric, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text := nb_code_of(p_token);
begin
  return query select s.slot, s.label, s.company, s.month, s.year, s.cash, s.updated_at
    from saves s where s.code = v_code order by s.updated_at desc;
end; $$;

create or replace function public.nb_get_save(p_token uuid, p_slot text)
returns text language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text := nb_code_of(p_token); v_payload text;
begin
  select payload into v_payload from saves where code = v_code and slot = p_slot;
  if v_payload is null then raise exception 'No save in that slot.'; end if;
  return v_payload;
end; $$;

create or replace function public.nb_put_save(
  p_token uuid, p_slot text, p_label text, p_payload text,
  p_company text default null, p_month integer default null,
  p_year integer default null, p_cash numeric default null)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text := nb_code_of(p_token);
begin
  if length(p_payload) > 4000000 then raise exception 'Save is too large.'; end if;
  insert into saves (code, slot, label, payload, company, month, year, cash, updated_at)
  values (v_code, p_slot, p_label, p_payload, p_company, p_month, p_year, p_cash, now())
  on conflict (code, slot) do update
    set label = excluded.label, payload = excluded.payload, company = excluded.company,
        month = excluded.month, year = excluded.year, cash = excluded.cash, updated_at = now();
end; $$;

create or replace function public.nb_delete_save(p_token uuid, p_slot text)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text := nb_code_of(p_token);
begin
  delete from saves where code = v_code and slot = p_slot;
end; $$;

create or replace function public.nb_submit_score(
  p_token uuid, p_score numeric, p_company text default null,
  p_month integer default null, p_year integer default null)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_code text := nb_code_of(p_token); v_name text;
begin
  select coalesce(display_name, code) into v_name from players where code = v_code;
  insert into scores (code, display_name, company, score, month, year, updated_at)
  values (v_code, v_name, p_company, p_score, p_month, p_year, now())
  on conflict (code) do update
    set score = greatest(scores.score, excluded.score),
        company = case when excluded.score >= scores.score then excluded.company else scores.company end,
        month = case when excluded.score >= scores.score then excluded.month else scores.month end,
        year = case when excluded.score >= scores.score then excluded.year else scores.year end,
        display_name = excluded.display_name,
        updated_at = now();
end; $$;

create or replace function public.nb_leaderboard()
returns table (display_name text, company text, score numeric, month integer, year integer, updated_at timestamptz)
language sql security definer set search_path = public, extensions, pg_temp as $$
  select display_name, company, score, month, year, updated_at
    from scores order by score desc limit 50;
$$;

-- keep-alive so the free project is never paused for inactivity
create or replace function public.nb_ping()
returns text language sql security definer set search_path = public, extensions, pg_temp as $$ select 'ok'::text $$;

-- ----------------------------------------------------------------- grants

revoke all on function public.nb_code_of(uuid) from public, anon, authenticated;

grant execute on function public.nb_register(text, text, text)                                   to anon, authenticated;
grant execute on function public.nb_login(text, text)                                            to anon, authenticated;
grant execute on function public.nb_list_saves(uuid)                                             to anon, authenticated;
grant execute on function public.nb_get_save(uuid, text)                                         to anon, authenticated;
grant execute on function public.nb_put_save(uuid, text, text, text, text, integer, integer, numeric) to anon, authenticated;
grant execute on function public.nb_delete_save(uuid, text)                                      to anon, authenticated;
grant execute on function public.nb_submit_score(uuid, numeric, text, integer, integer)          to anon, authenticated;
grant execute on function public.nb_leaderboard()                                                to anon, authenticated;
grant execute on function public.nb_ping()                                                       to anon, authenticated;
