begin;

-- Allow authenticated users to list only their own permanent worlds.
alter table public.worlds enable row level security;

drop policy if exists "Owners can view their worlds" on public.worlds;
create policy "Owners can view their worlds"
on public.worlds
for select
to authenticated
using (owner_user_id = (select auth.uid()));

-- Saved world collections must be visible to the world owner as well. Without
-- these policies the root world is returned, but every copied collection is empty.
alter table public.worlds_scene_images enable row level security;
alter table public.worlds_scene_music enable row level security;
alter table public.worlds_notes enable row level security;
alter table public.worlds_relationship_npcs enable row level security;
alter table public.worlds_assets enable row level security;
alter table public.worlds_scene_image_targets enable row level security;
alter table public.worlds_scene_music_targets enable row level security;
alter table public.worlds_relationship_links enable row level security;

drop policy if exists "Owners can view their world scene images" on public.worlds_scene_images;
create policy "Owners can view their world scene images" on public.worlds_scene_images
for select to authenticated using (exists (
  select 1 from public.worlds world
  where world.id = worlds_scene_images.world_id and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world scene music" on public.worlds_scene_music;
create policy "Owners can view their world scene music" on public.worlds_scene_music
for select to authenticated using (exists (
  select 1 from public.worlds world
  where world.id = worlds_scene_music.world_id and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world notes" on public.worlds_notes;
create policy "Owners can view their world notes" on public.worlds_notes
for select to authenticated using (exists (
  select 1 from public.worlds world
  where world.id = worlds_notes.world_id and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world relationship NPCs" on public.worlds_relationship_npcs;
create policy "Owners can view their world relationship NPCs" on public.worlds_relationship_npcs
for select to authenticated using (exists (
  select 1 from public.worlds world
  where world.id = worlds_relationship_npcs.world_id and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world assets" on public.worlds_assets;
create policy "Owners can view their world assets" on public.worlds_assets
for select to authenticated using (exists (
  select 1 from public.worlds world
  where world.id = worlds_assets.world_id and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world image targets" on public.worlds_scene_image_targets;
create policy "Owners can view their world image targets" on public.worlds_scene_image_targets
for select to authenticated using (exists (
  select 1
  from public.worlds_scene_images image
  join public.worlds world on world.id = image.world_id
  where image.id = worlds_scene_image_targets.world_scene_image_id
    and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world music targets" on public.worlds_scene_music_targets;
create policy "Owners can view their world music targets" on public.worlds_scene_music_targets
for select to authenticated using (exists (
  select 1
  from public.worlds_scene_music music
  join public.worlds world on world.id = music.world_id
  where music.id = worlds_scene_music_targets.world_scene_music_id
    and world.owner_user_id = (select auth.uid())
));

drop policy if exists "Owners can view their world relationship links" on public.worlds_relationship_links;
create policy "Owners can view their world relationship links" on public.worlds_relationship_links
for select to authenticated using (exists (
  select 1
  from public.worlds_relationship_npcs npc
  join public.worlds world on world.id = npc.world_id
  where npc.id = worlds_relationship_links.world_relationship_npc_id
    and world.owner_user_id = (select auth.uid())
));

-- Select a world without depending on a direct UPDATE policy for participants.
-- The function verifies both the lobby master and ownership of the world.
create or replace function public.select_lobby_world(
  p_participant_id uuid,
  p_world_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.session_participants participant
  set selected_world_id = p_world_id
  where participant.id = p_participant_id
    and participant.user_id = auth.uid()
    and participant.role = 'master'
    and participant.participation_status = 'active'
    and exists (
      select 1
      from public.worlds world
      where world.id = p_world_id
        and world.owner_user_id = auth.uid()
    );

  if not found then
    raise exception 'The world cannot be selected by this participant';
  end if;
end;
$$;

revoke all on function public.select_lobby_world(uuid, uuid) from public;
grant execute on function public.select_lobby_world(uuid, uuid) to authenticated;

-- Check a Storage object path without applying in_game_characters RLS again.
-- Expected path: sessions/{session_id}/characters/{character_id}/...
create schema if not exists private;

create or replace function private.can_manage_temporary_character_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  object_session_id uuid;
  object_character_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  path_parts := storage.foldername(object_name);

  if path_parts[1] is distinct from 'sessions'
    or path_parts[3] is distinct from 'characters'
    or path_parts[2] is null
    or path_parts[4] is null then
    return false;
  end if;

  begin
    object_session_id := path_parts[2]::uuid;
    object_character_id := path_parts[4]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from public.in_game_characters character
    where character.id = object_character_id
      and character.session_id = object_session_id
      and (
        character.user_id = auth.uid()
        or private.is_session_master(character.session_id)
      )
  );
end;
$$;

revoke all on function private.can_manage_temporary_character_object(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_manage_temporary_character_object(text) to authenticated;

-- Session-master checks bypass row policies only to establish membership. They
-- do not expose rows themselves; table policies below still scope every action.
create or replace function private.is_session_master(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.session_participants participant
    where participant.session_id = p_session_id
      and participant.user_id = auth.uid()
      and participant.role = 'master'
      and participant.participation_status = 'active'
  );
$$;

create or replace function private.is_character_session_master(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.in_game_characters character
    where character.id = target_character_id
      and private.is_session_master(character.session_id)
  );
$$;

create or replace function private.is_domain_session_master(target_domain_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.in_game_character_domains domain
    where domain.id = target_domain_id
      and private.is_character_session_master(domain.in_game_character_id)
  );
$$;

create or replace function private.is_world_session_master(target_world_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.in_game_worlds world
    where world.id = target_world_id
      and private.is_session_master(world.live_session_id)
  );
$$;

create or replace function private.is_world_image_session_master(target_image_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.in_game_worlds_scene_images image
    where image.id = target_image_id
      and private.is_world_session_master(image.in_game_world_id)
  );
$$;

create or replace function private.is_world_music_session_master(target_music_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.in_game_worlds_scene_music music
    where music.id = target_music_id
      and private.is_world_session_master(music.in_game_world_id)
  );
$$;

create or replace function private.is_world_npc_session_master(target_npc_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.in_game_worlds_relationship_npcs npc
    where npc.id = target_npc_id
      and private.is_world_session_master(npc.in_game_world_id)
  );
$$;

revoke all on function private.is_session_master(uuid) from public;
revoke all on function private.is_character_session_master(uuid) from public;
revoke all on function private.is_domain_session_master(uuid) from public;
revoke all on function private.is_world_session_master(uuid) from public;
revoke all on function private.is_world_image_session_master(uuid) from public;
revoke all on function private.is_world_music_session_master(uuid) from public;
revoke all on function private.is_world_npc_session_master(uuid) from public;
grant execute on function private.is_session_master(uuid) to authenticated;
grant execute on function private.is_character_session_master(uuid) to authenticated;
grant execute on function private.is_domain_session_master(uuid) to authenticated;
grant execute on function private.is_world_session_master(uuid) to authenticated;
grant execute on function private.is_world_image_session_master(uuid) to authenticated;
grant execute on function private.is_world_music_session_master(uuid) to authenticated;
grant execute on function private.is_world_npc_session_master(uuid) to authenticated;

create or replace function private.has_session_access(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.session_participants participant
    where participant.session_id = p_session_id
      and participant.user_id = auth.uid()
      and participant.participation_status in ('active', 'save_pending')
  );
$$;

revoke all on function private.has_session_access(uuid) from public;
grant execute on function private.has_session_access(uuid) to authenticated;

drop policy if exists "Participants can view active or pending sessions" on public.live_sessions;
create policy "Participants can view active or pending sessions"
on public.live_sessions
for select
to authenticated
using (private.has_session_access(id));

drop policy if exists "Participants can view members while saving" on public.session_participants;
create policy "Participants can view members while saving"
on public.session_participants
for select
to authenticated
using (private.has_session_access(session_id));

create or replace function private.can_manage_temporary_world_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  object_session_id uuid;
  object_world_id uuid;
begin
  if auth.uid() is null then return false; end if;
  path_parts := storage.foldername(object_name);

  if path_parts[1] is distinct from 'sessions'
    or path_parts[3] is distinct from 'worlds'
    or path_parts[2] is null
    or path_parts[4] is null then
    return false;
  end if;

  begin
    object_session_id := path_parts[2]::uuid;
    object_world_id := path_parts[4]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1 from public.in_game_worlds world
    where world.id = object_world_id
      and world.live_session_id = object_session_id
      and private.is_session_master(world.live_session_id)
  );
end;
$$;

revoke all on function private.can_manage_temporary_world_object(text) from public;
grant execute on function private.can_manage_temporary_world_object(text) to authenticated;

-- The master may prepare and edit every temporary character in their session.
drop policy if exists "Session masters can manage characters" on public.in_game_characters;
create policy "Session masters can manage characters" on public.in_game_characters
for all to authenticated
using (private.is_session_master(session_id))
with check (private.is_session_master(session_id));

drop policy if exists "Session masters can manage character attributes" on public.in_game_character_attributes;
create policy "Session masters can manage character attributes" on public.in_game_character_attributes
for all to authenticated
using (private.is_character_session_master(in_game_character_id))
with check (private.is_character_session_master(in_game_character_id));

drop policy if exists "Session masters can manage character parameters" on public.in_game_character_parameters;
create policy "Session masters can manage character parameters" on public.in_game_character_parameters
for all to authenticated
using (private.is_character_session_master(in_game_character_id))
with check (private.is_character_session_master(in_game_character_id));

drop policy if exists "Session masters can manage character domains" on public.in_game_character_domains;
create policy "Session masters can manage character domains" on public.in_game_character_domains
for all to authenticated
using (private.is_character_session_master(in_game_character_id))
with check (private.is_character_session_master(in_game_character_id));

drop policy if exists "Session masters can manage character domain skills" on public.in_game_character_domain_skills;
create policy "Session masters can manage character domain skills" on public.in_game_character_domain_skills
for all to authenticated
using (private.is_domain_session_master(in_game_domain_id))
with check (private.is_domain_session_master(in_game_domain_id));

drop policy if exists "Session masters can manage character inventory" on public.in_game_character_inventory_items;
create policy "Session masters can manage character inventory" on public.in_game_character_inventory_items
for all to authenticated
using (private.is_character_session_master(in_game_character_id))
with check (private.is_character_session_master(in_game_character_id));

drop policy if exists "Session masters can manage character notes" on public.in_game_character_notes;
create policy "Session masters can manage character notes" on public.in_game_character_notes
for all to authenticated
using (private.is_character_session_master(in_game_character_id))
with check (private.is_character_session_master(in_game_character_id));

drop policy if exists "Session masters can manage character experiences" on public.in_game_character_experiences;
create policy "Session masters can manage character experiences" on public.in_game_character_experiences
for all to authenticated
using (private.is_character_session_master(in_game_character_id))
with check (private.is_character_session_master(in_game_character_id));

-- The master may create and manage the temporary world and its direct content.
drop policy if exists "Session masters can manage worlds" on public.in_game_worlds;
create policy "Session masters can manage worlds" on public.in_game_worlds
for all to authenticated
using (private.is_session_master(live_session_id))
with check (private.is_session_master(live_session_id));

drop policy if exists "Session masters can manage world images" on public.in_game_worlds_scene_images;
create policy "Session masters can manage world images" on public.in_game_worlds_scene_images
for all to authenticated
using (private.is_world_session_master(in_game_world_id))
with check (private.is_world_session_master(in_game_world_id));

drop policy if exists "Session masters can manage world music" on public.in_game_worlds_scene_music;
create policy "Session masters can manage world music" on public.in_game_worlds_scene_music
for all to authenticated
using (private.is_world_session_master(in_game_world_id))
with check (private.is_world_session_master(in_game_world_id));

drop policy if exists "Session masters can manage world notes" on public.in_game_worlds_notes;
create policy "Session masters can manage world notes" on public.in_game_worlds_notes
for all to authenticated
using (private.is_world_session_master(in_game_world_id))
with check (private.is_world_session_master(in_game_world_id));

drop policy if exists "Session masters can manage world assets" on public.in_game_worlds_assets;
create policy "Session masters can manage world assets" on public.in_game_worlds_assets
for all to authenticated
using (private.is_world_session_master(in_game_world_id))
with check (private.is_world_session_master(in_game_world_id));

drop policy if exists "Session masters can manage world relationship NPCs" on public.in_game_worlds_relationship_npcs;
create policy "Session masters can manage world relationship NPCs" on public.in_game_worlds_relationship_npcs
for all to authenticated
using (private.is_world_session_master(in_game_world_id))
with check (private.is_world_session_master(in_game_world_id));

drop policy if exists "Session masters can manage world image targets" on public.in_game_worlds_scene_image_targets;
create policy "Session masters can manage world image targets" on public.in_game_worlds_scene_image_targets
for all to authenticated
using (private.is_world_image_session_master(in_game_scene_image_id))
with check (private.is_world_image_session_master(in_game_scene_image_id));

drop policy if exists "Session masters can manage world music targets" on public.in_game_worlds_scene_music_targets;
create policy "Session masters can manage world music targets" on public.in_game_worlds_scene_music_targets
for all to authenticated
using (private.is_world_music_session_master(in_game_scene_music_id))
with check (private.is_world_music_session_master(in_game_scene_music_id));

drop policy if exists "Session masters can manage world relationship links" on public.in_game_worlds_relationship_links;
create policy "Session masters can manage world relationship links" on public.in_game_worlds_relationship_links
for all to authenticated
using (private.is_world_npc_session_master(in_game_npc_id))
with check (private.is_world_npc_session_master(in_game_npc_id));

drop policy if exists "Players can read their temporary character portraits" on storage.objects;
create policy "Players can read their temporary character portraits"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_character_object(name)
);

drop policy if exists "Players can upload their temporary character portraits" on storage.objects;
create policy "Players can upload their temporary character portraits"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_character_object(name)
);

drop policy if exists "Players can replace their temporary character portraits" on storage.objects;
create policy "Players can replace their temporary character portraits"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_character_object(name)
)
with check (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_character_object(name)
);

drop policy if exists "Players can delete their temporary character portraits" on storage.objects;
create policy "Players can delete their temporary character portraits"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_character_object(name)
);

drop policy if exists "Masters can read their temporary world avatars" on storage.objects;
create policy "Masters can read their temporary world avatars" on storage.objects
for select to authenticated using (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_world_object(name)
);

drop policy if exists "Masters can upload their temporary world avatars" on storage.objects;
create policy "Masters can upload their temporary world avatars" on storage.objects
for insert to authenticated with check (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_world_object(name)
);

drop policy if exists "Masters can replace their temporary world avatars" on storage.objects;
create policy "Masters can replace their temporary world avatars" on storage.objects
for update to authenticated
using (bucket_id = 'temporary-avatars' and private.can_manage_temporary_world_object(name))
with check (bucket_id = 'temporary-avatars' and private.can_manage_temporary_world_object(name));

drop policy if exists "Masters can delete their temporary world avatars" on storage.objects;
create policy "Masters can delete their temporary world avatars" on storage.objects
for delete to authenticated using (
  bucket_id = 'temporary-avatars'
  and private.can_manage_temporary_world_object(name)
);

commit;

notify pgrst, 'reload schema';
