-- Character schema for Supabase SQL Editor.
-- This script does not run automatically from the Next.js app.
-- Relationships are intentionally not part of character data because they come from worlds.

create extension if not exists "pgcrypto";

drop table if exists public.in_game_character_relationships;
drop table if exists public.character_relationships;
drop table if exists public.in_game_character_npcs;
drop table if exists public.character_npcs;
drop table if exists public.in_game_character_skills;
drop table if exists public.character_skills;

create table if not exists public.character_attributes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  attribute_key text not null check (
    attribute_key in (
      'constitution',
      'awareness',
      'agility',
      'thinking',
      'charisma',
      'will'
    )
  ),
  label text not null,
  icon_key text not null,
  value integer not null default 1 check (value between 1 and 6),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, attribute_key)
);

create table if not exists public.character_parameters (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  parameter_key text not null check (parameter_key in ('health', 'inspiration', 'stress')),
  label text not null,
  icon_key text not null,
  current_value integer not null default 0 check (current_value >= 0),
  max_value integer check (max_value is null or max_value >= 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, parameter_key)
);

alter table public.character_parameters
  drop column if exists source_attribute_key,
  drop column if exists source_multiplier;

create table if not exists public.character_domains (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  domain_key text not null,
  name text not null,
  description text,
  icon_key text,
  level integer not null default 1 check (level between 1 and 6),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, domain_key)
);

create table if not exists public.character_domain_skills (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.character_domains(id) on delete cascade,
  skill_key text not null,
  name text not null,
  description text,
  is_primary boolean not null default false,
  level integer not null default 1 check (level between 1 and 6),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain_id, skill_key)
);

comment on column public.character_domain_skills.level is
  'For regular skills this is the unlock level. For the primary skill, display level follows the parent domain level.';

create unique index if not exists idx_character_domain_skills_one_primary
  on public.character_domain_skills(domain_id)
  where is_primary;

create table if not exists public.character_inventory_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'item',
  quantity integer not null default 1 check (quantity >= 0),
  image_url text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_notes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  title text not null,
  content text,
  canvas_x numeric not null default 0,
  canvas_y numeric not null default 0,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_experiences (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  headline text not null,
  description text,
  xp integer not null default 0 check (xp >= 0),
  tag text,
  session_label text,
  happened_at date,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.in_game_characters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  participant_id uuid references public.session_participants(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_character_id uuid references public.characters(id) on delete set null,
  name text not null default 'Unnamed adventurer',
  description text,
  avatar_url text,
  is_placeholder boolean not null default false,
  save_status text not null default 'temporary'
    check (save_status in ('temporary', 'saved_as_new', 'overwritten', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.in_game_character_attributes (
  id uuid primary key default gen_random_uuid(),
  in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  source_attribute_id uuid references public.character_attributes(id) on delete set null,
  attribute_key text not null check (
    attribute_key in (
      'constitution',
      'awareness',
      'agility',
      'thinking',
      'charisma',
      'will'
    )
  ),
  label text not null,
  icon_key text not null,
  value integer not null default 1 check (value between 1 and 6),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (in_game_character_id, attribute_key)
);

create table if not exists public.in_game_character_parameters (
  id uuid primary key default gen_random_uuid(),
  in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  source_parameter_id uuid references public.character_parameters(id) on delete set null,
  parameter_key text not null check (parameter_key in ('health', 'inspiration', 'stress')),
  label text not null,
  icon_key text not null,
  current_value integer not null default 0 check (current_value >= 0),
  max_value integer check (max_value is null or max_value >= 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (in_game_character_id, parameter_key)
);

alter table public.in_game_character_parameters
  drop column if exists source_attribute_key,
  drop column if exists source_multiplier;

create table if not exists public.in_game_character_domains (
  id uuid primary key default gen_random_uuid(),
  in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  source_domain_id uuid references public.character_domains(id) on delete set null,
  domain_key text not null,
  name text not null,
  description text,
  icon_key text,
  level integer not null default 1 check (level between 1 and 6),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (in_game_character_id, domain_key)
);

create table if not exists public.in_game_character_domain_skills (
  id uuid primary key default gen_random_uuid(),
  in_game_domain_id uuid not null references public.in_game_character_domains(id) on delete cascade,
  source_skill_id uuid references public.character_domain_skills(id) on delete set null,
  skill_key text not null,
  name text not null,
  description text,
  is_primary boolean not null default false,
  level integer not null default 1 check (level between 1 and 6),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (in_game_domain_id, skill_key)
);

comment on column public.in_game_character_domain_skills.level is
  'For regular skills this is the unlock level. For the primary skill, display level follows the parent domain level.';

create unique index if not exists idx_in_game_character_domain_skills_one_primary
  on public.in_game_character_domain_skills(in_game_domain_id)
  where is_primary;

create table if not exists public.in_game_character_inventory_items (
  id uuid primary key default gen_random_uuid(),
  in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  source_item_id uuid references public.character_inventory_items(id) on delete set null,
  name text not null,
  description text,
  category text not null default 'item',
  quantity integer not null default 1 check (quantity >= 0),
  image_url text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.in_game_character_notes (
  id uuid primary key default gen_random_uuid(),
  in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  source_note_id uuid references public.character_notes(id) on delete set null,
  title text not null,
  content text,
  canvas_x numeric not null default 0,
  canvas_y numeric not null default 0,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.in_game_character_experiences (
  id uuid primary key default gen_random_uuid(),
  in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  source_experience_id uuid references public.character_experiences(id) on delete set null,
  headline text not null,
  description text,
  xp integer not null default 0 check (xp >= 0),
  tag text,
  session_label text,
  happened_at date,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair columns for projects that already ran an earlier version of this script.
-- `create table if not exists` does not update existing tables, so these keep Supabase
-- SQL Editor reruns safe while still adding the columns used by the app code.
alter table if exists public.character_attributes
  add column if not exists character_id uuid references public.characters(id) on delete cascade,
  add column if not exists attribute_key text,
  add column if not exists label text,
  add column if not exists icon_key text,
  add column if not exists value integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.character_parameters
  add column if not exists character_id uuid references public.characters(id) on delete cascade,
  add column if not exists parameter_key text,
  add column if not exists label text,
  add column if not exists icon_key text,
  add column if not exists current_value integer not null default 0,
  add column if not exists max_value integer,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.character_domains
  add column if not exists character_id uuid references public.characters(id) on delete cascade,
  add column if not exists domain_key text,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists icon_key text,
  add column if not exists level integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.character_domain_skills
  add column if not exists domain_id uuid references public.character_domains(id) on delete cascade,
  add column if not exists skill_key text,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists level integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.character_inventory_items
  add column if not exists character_id uuid references public.characters(id) on delete cascade,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists category text not null default 'item',
  add column if not exists quantity integer not null default 1,
  add column if not exists image_url text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.character_notes
  add column if not exists character_id uuid references public.characters(id) on delete cascade,
  add column if not exists title text,
  add column if not exists content text,
  add column if not exists canvas_x numeric not null default 0,
  add column if not exists canvas_y numeric not null default 0,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.character_experiences
  add column if not exists character_id uuid references public.characters(id) on delete cascade,
  add column if not exists headline text,
  add column if not exists description text,
  add column if not exists xp integer not null default 0,
  add column if not exists tag text,
  add column if not exists session_label text,
  add column if not exists happened_at date,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_characters
  add column if not exists session_id uuid references public.live_sessions(id) on delete cascade,
  add column if not exists participant_id uuid references public.session_participants(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source_character_id uuid references public.characters(id) on delete set null,
  add column if not exists name text not null default 'Unnamed adventurer',
  add column if not exists description text,
  add column if not exists avatar_url text,
  add column if not exists is_placeholder boolean not null default false,
  add column if not exists save_status text not null default 'temporary',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_attributes
  add column if not exists in_game_character_id uuid references public.in_game_characters(id) on delete cascade,
  add column if not exists source_attribute_id uuid references public.character_attributes(id) on delete set null,
  add column if not exists attribute_key text,
  add column if not exists label text,
  add column if not exists icon_key text,
  add column if not exists value integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_parameters
  add column if not exists in_game_character_id uuid references public.in_game_characters(id) on delete cascade,
  add column if not exists source_parameter_id uuid references public.character_parameters(id) on delete set null,
  add column if not exists parameter_key text,
  add column if not exists label text,
  add column if not exists icon_key text,
  add column if not exists current_value integer not null default 0,
  add column if not exists max_value integer,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_domains
  add column if not exists in_game_character_id uuid references public.in_game_characters(id) on delete cascade,
  add column if not exists source_domain_id uuid references public.character_domains(id) on delete set null,
  add column if not exists domain_key text,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists icon_key text,
  add column if not exists level integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_domain_skills
  add column if not exists in_game_domain_id uuid references public.in_game_character_domains(id) on delete cascade,
  add column if not exists source_skill_id uuid references public.character_domain_skills(id) on delete set null,
  add column if not exists skill_key text,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists level integer not null default 1,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_inventory_items
  add column if not exists in_game_character_id uuid references public.in_game_characters(id) on delete cascade,
  add column if not exists source_item_id uuid references public.character_inventory_items(id) on delete set null,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists category text not null default 'item',
  add column if not exists quantity integer not null default 1,
  add column if not exists image_url text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_notes
  add column if not exists in_game_character_id uuid references public.in_game_characters(id) on delete cascade,
  add column if not exists source_note_id uuid references public.character_notes(id) on delete set null,
  add column if not exists title text,
  add column if not exists content text,
  add column if not exists canvas_x numeric not null default 0,
  add column if not exists canvas_y numeric not null default 0,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.in_game_character_experiences
  add column if not exists in_game_character_id uuid references public.in_game_characters(id) on delete cascade,
  add column if not exists source_experience_id uuid references public.character_experiences(id) on delete set null,
  add column if not exists headline text,
  add column if not exists description text,
  add column if not exists xp integer not null default 0,
  add column if not exists tag text,
  add column if not exists session_label text,
  add column if not exists happened_at date,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_character_attributes_character_id
  on public.character_attributes(character_id);
create index if not exists idx_character_parameters_character_id
  on public.character_parameters(character_id);
create index if not exists idx_character_domains_character_id
  on public.character_domains(character_id);
create index if not exists idx_character_domain_skills_domain_id
  on public.character_domain_skills(domain_id);
create index if not exists idx_character_inventory_items_character_id
  on public.character_inventory_items(character_id);
create index if not exists idx_character_notes_character_id
  on public.character_notes(character_id);
create index if not exists idx_character_experiences_character_id
  on public.character_experiences(character_id);

create index if not exists idx_in_game_characters_session_id
  on public.in_game_characters(session_id);
create index if not exists idx_in_game_characters_user_id
  on public.in_game_characters(user_id);
create index if not exists idx_in_game_characters_source_character_id
  on public.in_game_characters(source_character_id);
create index if not exists idx_in_game_character_attributes_character_id
  on public.in_game_character_attributes(in_game_character_id);
create index if not exists idx_in_game_character_parameters_character_id
  on public.in_game_character_parameters(in_game_character_id);
create index if not exists idx_in_game_character_domains_character_id
  on public.in_game_character_domains(in_game_character_id);
create index if not exists idx_in_game_character_domain_skills_domain_id
  on public.in_game_character_domain_skills(in_game_domain_id);
create index if not exists idx_in_game_character_inventory_items_character_id
  on public.in_game_character_inventory_items(in_game_character_id);
create index if not exists idx_in_game_character_notes_character_id
  on public.in_game_character_notes(in_game_character_id);
create index if not exists idx_in_game_character_experiences_character_id
  on public.in_game_character_experiences(in_game_character_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'characters',
    'character_attributes',
    'character_parameters',
    'character_domains',
    'character_domain_skills',
    'character_inventory_items',
    'character_notes',
    'character_experiences',
    'in_game_characters',
    'in_game_character_attributes',
    'in_game_character_parameters',
    'in_game_character_domains',
    'in_game_character_domain_skills',
    'in_game_character_inventory_items',
    'in_game_character_notes',
    'in_game_character_experiences'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.start_lobby_game_with_characters(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := auth.uid();
  v_session record;
  v_player record;
  v_source_character_id uuid;
  v_in_game_character_id uuid;
  v_in_game_domain_id uuid;
  v_domain record;
  v_name text;
  v_description text;
  v_avatar_url text;
  v_is_placeholder boolean;
  v_health integer;
  v_player_count integer := 0;
  v_created_count integer := 0;
begin
  if p_session_id is null then
    raise exception 'Session id is required';
  end if;

  if v_request_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select id, created_by, phase
  into v_session
  from public.live_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Lobby not found';
  end if;

  if v_session.phase <> 'lobby' then
    raise exception 'Lobby is not in lobby phase';
  end if;

  if v_session.created_by <> v_request_user_id
    and not exists (
      select 1
      from public.session_participants
      where session_id = p_session_id
        and user_id = v_request_user_id
        and role = 'master'
    )
  then
    raise exception 'Only the master can start the game';
  end if;

  select count(*)
  into v_player_count
  from public.session_participants
  where session_id = p_session_id
    and role = 'player';

  if v_player_count < 1 then
    raise exception 'At least one player is required to create game characters';
  end if;

  delete from public.in_game_character_domain_skills skills
  using public.in_game_character_domains domains,
        public.in_game_characters characters
  where skills.in_game_domain_id = domains.id
    and domains.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_character_domains domains
  using public.in_game_characters characters
  where domains.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_character_attributes attributes
  using public.in_game_characters characters
  where attributes.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_character_parameters parameters
  using public.in_game_characters characters
  where parameters.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_character_inventory_items items
  using public.in_game_characters characters
  where items.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_character_notes notes
  using public.in_game_characters characters
  where notes.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_character_experiences experiences
  using public.in_game_characters characters
  where experiences.in_game_character_id = characters.id
    and characters.session_id = p_session_id;

  delete from public.in_game_characters
  where session_id = p_session_id;

  for v_player in
    select id, session_id, user_id, selected_character_id
    from public.session_participants
    where session_id = p_session_id
      and role = 'player'
    order by joined_at
  loop
    v_source_character_id := null;
    v_name := 'Unnamed adventurer';
    v_description := 'Temporary character created for this game session.';
    v_avatar_url := null;
    v_is_placeholder := true;

    if v_player.selected_character_id is not null then
      select id, name, description, avatar_url
      into v_source_character_id, v_name, v_description, v_avatar_url
      from public.characters
      where id = v_player.selected_character_id
        and owner_user_id = v_player.user_id;

      if found then
        v_is_placeholder := false;
      else
        v_source_character_id := null;
        v_name := 'Unnamed adventurer';
        v_description := 'Temporary character created for this game session.';
        v_avatar_url := null;
        v_is_placeholder := true;
      end if;
    end if;

    insert into public.in_game_characters (
      session_id,
      participant_id,
      user_id,
      source_character_id,
      name,
      description,
      avatar_url,
      is_placeholder,
      save_status
    )
    values (
      p_session_id,
      v_player.id,
      v_player.user_id,
      v_source_character_id,
      v_name,
      v_description,
      v_avatar_url,
      v_is_placeholder,
      'temporary'
    )
    returning id into v_in_game_character_id;

    if v_source_character_id is not null then
      insert into public.in_game_character_attributes (
        in_game_character_id,
        source_attribute_id,
        attribute_key,
        label,
        icon_key,
        value,
        sort_order,
        metadata
      )
      select
        v_in_game_character_id,
        id,
        attribute_key,
        label,
        icon_key,
        value,
        sort_order,
        metadata
      from public.character_attributes
      where character_id = v_source_character_id
      order by sort_order;

      insert into public.in_game_character_parameters (
        in_game_character_id,
        source_parameter_id,
        parameter_key,
        label,
        icon_key,
        current_value,
        max_value,
        sort_order,
        metadata
      )
      select
        v_in_game_character_id,
        id,
        parameter_key,
        label,
        icon_key,
        current_value,
        max_value,
        sort_order,
        metadata
      from public.character_parameters
      where character_id = v_source_character_id
      order by sort_order;

      for v_domain in
        select id, domain_key, name, description, icon_key, level, sort_order, metadata
        from public.character_domains
        where character_id = v_source_character_id
        order by sort_order
      loop
        insert into public.in_game_character_domains (
          in_game_character_id,
          source_domain_id,
          domain_key,
          name,
          description,
          icon_key,
          level,
          sort_order,
          metadata
        )
        values (
          v_in_game_character_id,
          v_domain.id,
          v_domain.domain_key,
          v_domain.name,
          v_domain.description,
          v_domain.icon_key,
          v_domain.level,
          v_domain.sort_order,
          v_domain.metadata
        )
        returning id into v_in_game_domain_id;

        insert into public.in_game_character_domain_skills (
          in_game_domain_id,
          source_skill_id,
          skill_key,
          name,
          description,
          is_primary,
          level,
          sort_order,
          metadata
        )
        select
          v_in_game_domain_id,
          id,
          skill_key,
          name,
          description,
          is_primary,
          level,
          sort_order,
          metadata
        from public.character_domain_skills
        where domain_id = v_domain.id
        order by sort_order;
      end loop;

      insert into public.in_game_character_inventory_items (
        in_game_character_id,
        source_item_id,
        name,
        description,
        category,
        quantity,
        image_url,
        sort_order,
        metadata
      )
      select
        v_in_game_character_id,
        id,
        name,
        description,
        category,
        quantity,
        image_url,
        sort_order,
        metadata
      from public.character_inventory_items
      where character_id = v_source_character_id
      order by sort_order;

      insert into public.in_game_character_notes (
        in_game_character_id,
        source_note_id,
        title,
        content,
        canvas_x,
        canvas_y,
        sort_order,
        metadata
      )
      select
        v_in_game_character_id,
        id,
        title,
        content,
        canvas_x,
        canvas_y,
        sort_order,
        metadata
      from public.character_notes
      where character_id = v_source_character_id
      order by sort_order;

      insert into public.in_game_character_experiences (
        in_game_character_id,
        source_experience_id,
        headline,
        description,
        xp,
        tag,
        session_label,
        happened_at,
        sort_order,
        metadata
      )
      select
        v_in_game_character_id,
        id,
        headline,
        description,
        xp,
        tag,
        session_label,
        happened_at,
        sort_order,
        metadata
      from public.character_experiences
      where character_id = v_source_character_id
      order by sort_order;
    end if;

    if not exists (
      select 1
      from public.in_game_character_attributes
      where in_game_character_id = v_in_game_character_id
    ) then
      insert into public.in_game_character_attributes (
        in_game_character_id,
        attribute_key,
        label,
        icon_key,
        value,
        sort_order,
        metadata
      )
      values
        (v_in_game_character_id, 'constitution', 'Constitution', 'heart-pulse', 1, 0, '{}'::jsonb),
        (v_in_game_character_id, 'awareness', 'Awareness', 'user-alert', 1, 1, '{}'::jsonb),
        (v_in_game_character_id, 'agility', 'Agility', 'running', 1, 2, '{}'::jsonb),
        (v_in_game_character_id, 'thinking', 'Thinking', 'brain', 1, 3, '{}'::jsonb),
        (v_in_game_character_id, 'charisma', 'Charisma', 'mask', 1, 4, '{}'::jsonb),
        (v_in_game_character_id, 'will', 'Will', 'fist', 1, 5, '{}'::jsonb);
    end if;

    if not exists (
      select 1
      from public.in_game_character_parameters
      where in_game_character_id = v_in_game_character_id
    ) then
      select coalesce(
        max(value) filter (where attribute_key = 'constitution'),
        1
      ) * 5
      into v_health
      from public.in_game_character_attributes
      where in_game_character_id = v_in_game_character_id;

      insert into public.in_game_character_parameters (
        in_game_character_id,
        parameter_key,
        label,
        icon_key,
        current_value,
        max_value,
        sort_order,
        metadata
      )
      values
        (v_in_game_character_id, 'health', 'Health', 'heart', v_health, v_health, 0, '{}'::jsonb),
        (v_in_game_character_id, 'inspiration', 'Inspiration', 'star', 6, null, 1, '{}'::jsonb),
        (v_in_game_character_id, 'stress', 'Stress', 'stress', 0, null, 2, '{}'::jsonb);
    end if;

    v_created_count := v_created_count + 1;
  end loop;

  if v_created_count <> v_player_count then
    raise exception 'Created % in-game characters for % players', v_created_count, v_player_count;
  end if;

  update public.live_sessions
  set
    phase = 'active',
    started_at = now(),
    cleanup_at = null
  where id = p_session_id;

  return v_created_count;
end;
$$;

revoke all on function public.start_lobby_game_with_characters(uuid) from public;
grant execute on function public.start_lobby_game_with_characters(uuid) to anon, authenticated;
