-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.character_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  attribute_key text NOT NULL CHECK (attribute_key = ANY (ARRAY['constitution'::text, 'awareness'::text, 'agility'::text, 'thinking'::text, 'charisma'::text, 'will'::text])),
  label text NOT NULL,
  icon_key text NOT NULL,
  value integer NOT NULL DEFAULT 1 CHECK (value >= 1 AND value <= 6),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_attributes_pkey PRIMARY KEY (id),
  CONSTRAINT character_attributes_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.character_domain_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL,
  skill_key text NOT NULL,
  name text NOT NULL,
  description text,
  is_primary boolean NOT NULL DEFAULT false,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 6),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_domain_skills_pkey PRIMARY KEY (id),
  CONSTRAINT character_domain_skills_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.character_domains(id)
);
CREATE TABLE public.character_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  domain_key text NOT NULL,
  name text NOT NULL,
  description text,
  icon_key text,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 6),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_domains_pkey PRIMARY KEY (id),
  CONSTRAINT character_domains_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.character_experiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  headline text NOT NULL,
  description text,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  tag text,
  session_label text,
  happened_at date,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_experiences_pkey PRIMARY KEY (id),
  CONSTRAINT character_experiences_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.character_inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'item'::text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT character_inventory_items_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.character_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  canvas_x numeric NOT NULL DEFAULT 0,
  canvas_y numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_notes_pkey PRIMARY KEY (id),
  CONSTRAINT character_notes_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.character_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL,
  parameter_key text NOT NULL CHECK (parameter_key = ANY (ARRAY['health'::text, 'inspiration'::text, 'stress'::text])),
  label text NOT NULL,
  icon_key text NOT NULL,
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  max_value integer CHECK (max_value IS NULL OR max_value >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT character_parameters_pkey PRIMARY KEY (id),
  CONSTRAINT character_parameters_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT characters_pkey PRIMARY KEY (id),
  CONSTRAINT characters_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.in_game_character_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_character_id uuid NOT NULL,
  source_attribute_id uuid,
  attribute_key text NOT NULL CHECK (attribute_key = ANY (ARRAY['constitution'::text, 'awareness'::text, 'agility'::text, 'thinking'::text, 'charisma'::text, 'will'::text])),
  label text NOT NULL,
  icon_key text NOT NULL,
  value integer NOT NULL DEFAULT 1 CHECK (value >= 1 AND value <= 6),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT in_game_character_attributes_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_attributes_in_game_character_id_fkey FOREIGN KEY (in_game_character_id) REFERENCES public.in_game_characters(id),
  CONSTRAINT in_game_character_attributes_source_attribute_id_fkey FOREIGN KEY (source_attribute_id) REFERENCES public.character_attributes(id)
);
CREATE TABLE public.in_game_character_domain_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_domain_id uuid NOT NULL,
  source_skill_id uuid,
  skill_key text NOT NULL,
  name text NOT NULL,
  description text,
  is_primary boolean NOT NULL DEFAULT false,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 6),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT in_game_character_domain_skills_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_domain_skills_in_game_domain_id_fkey FOREIGN KEY (in_game_domain_id) REFERENCES public.in_game_character_domains(id),
  CONSTRAINT in_game_character_domain_skills_source_skill_id_fkey FOREIGN KEY (source_skill_id) REFERENCES public.character_domain_skills(id)
);
CREATE TABLE public.in_game_character_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_character_id uuid NOT NULL,
  source_domain_id uuid,
  domain_key text NOT NULL,
  name text NOT NULL,
  description text,
  icon_key text,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 6),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT in_game_character_domains_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_domains_in_game_character_id_fkey FOREIGN KEY (in_game_character_id) REFERENCES public.in_game_characters(id),
  CONSTRAINT in_game_character_domains_source_domain_id_fkey FOREIGN KEY (source_domain_id) REFERENCES public.character_domains(id)
);
CREATE TABLE public.in_game_character_experiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_character_id uuid NOT NULL,
  headline text NOT NULL,
  description text,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  tag text,
  session_label text,
  happened_at date,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source_experience_id uuid,
  CONSTRAINT in_game_character_experiences_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_experiences_in_game_character_id_fkey FOREIGN KEY (in_game_character_id) REFERENCES public.in_game_characters(id),
  CONSTRAINT in_game_character_experiences_source_experience_id_fkey FOREIGN KEY (source_experience_id) REFERENCES public.character_experiences(id)
);
CREATE TABLE public.in_game_character_inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_character_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'item'::text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source_item_id uuid,
  CONSTRAINT in_game_character_inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_inventory_items_in_game_character_id_fkey FOREIGN KEY (in_game_character_id) REFERENCES public.in_game_characters(id),
  CONSTRAINT in_game_character_inventory_items_source_item_id_fkey FOREIGN KEY (source_item_id) REFERENCES public.character_inventory_items(id)
);
CREATE TABLE public.in_game_character_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_character_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  canvas_x numeric NOT NULL DEFAULT 0,
  canvas_y numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source_note_id uuid,
  CONSTRAINT in_game_character_notes_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_notes_in_game_character_id_fkey FOREIGN KEY (in_game_character_id) REFERENCES public.in_game_characters(id),
  CONSTRAINT in_game_character_notes_source_note_id_fkey FOREIGN KEY (source_note_id) REFERENCES public.character_notes(id)
);
CREATE TABLE public.in_game_character_parameters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  in_game_character_id uuid NOT NULL,
  source_parameter_id uuid,
  parameter_key text NOT NULL CHECK (parameter_key = ANY (ARRAY['health'::text, 'inspiration'::text, 'stress'::text])),
  label text NOT NULL,
  icon_key text NOT NULL,
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  max_value integer CHECK (max_value IS NULL OR max_value >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT in_game_character_parameters_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_character_parameters_in_game_character_id_fkey FOREIGN KEY (in_game_character_id) REFERENCES public.in_game_characters(id),
  CONSTRAINT in_game_character_parameters_source_parameter_id_fkey FOREIGN KEY (source_parameter_id) REFERENCES public.character_parameters(id)
);
CREATE TABLE public.in_game_characters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  participant_id uuid,
  user_id uuid NOT NULL,
  source_character_id uuid,
  name text NOT NULL DEFAULT 'Unnamed adventurer'::text,
  description text,
  avatar_url text,
  is_placeholder boolean NOT NULL DEFAULT false,
  save_status text NOT NULL DEFAULT 'temporary'::text CHECK (save_status = ANY (ARRAY['temporary'::text, 'saved_as_new'::text, 'overwritten'::text, 'discarded'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT in_game_characters_pkey PRIMARY KEY (id),
  CONSTRAINT in_game_characters_source_character_id_fkey FOREIGN KEY (source_character_id) REFERENCES public.characters(id),
  CONSTRAINT in_game_characters_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id),
  CONSTRAINT in_game_characters_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.session_participants(id),
  CONSTRAINT in_game_characters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'::text),
  created_by uuid NOT NULL,
  phase text NOT NULL DEFAULT 'lobby'::text CHECK (phase = ANY (ARRAY['lobby'::text, 'active'::text, 'ended'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  cleanup_at timestamp with time zone,
  CONSTRAINT live_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT live_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.session_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['master'::text, 'player'::text])),
  display_name text,
  avatar_url text,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  selected_character_id uuid,
  selected_world_id uuid,
  connection_status text NOT NULL DEFAULT 'online'::text CHECK (connection_status = ANY (ARRAY['online'::text, 'offline'::text])),
  last_seen_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT session_participants_pkey PRIMARY KEY (id),
  CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id),
  CONSTRAINT session_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT session_participants_selected_character_id_fkey FOREIGN KEY (selected_character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.worlds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT worlds_pkey PRIMARY KEY (id),
  CONSTRAINT worlds_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id)
);