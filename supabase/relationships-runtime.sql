begin;

alter table public.in_game_worlds_relationship_links
  drop constraint if exists in_game_worlds_relationship_links_value_check;

alter table public.in_game_worlds_relationship_links
  add constraint in_game_worlds_relationship_links_value_check
  check (relationship_value between -5 and 5);

alter table public.worlds_relationship_links
  drop constraint if exists worlds_relationship_links_value_check;

alter table public.worlds_relationship_links
  add constraint worlds_relationship_links_value_check
  check (relationship_value between -5 and 5);

alter table public.in_game_worlds_relationship_npcs
  drop constraint if exists in_game_worlds_relationship_npcs_name_length_check;

alter table public.in_game_worlds_relationship_npcs
  add constraint in_game_worlds_relationship_npcs_name_length_check
  check (char_length(name) between 1 and 80);

alter table public.in_game_worlds_relationship_npcs
  drop constraint if exists in_game_worlds_relationship_npcs_description_length_check;

alter table public.in_game_worlds_relationship_npcs
  add constraint in_game_worlds_relationship_npcs_description_length_check
  check (char_length(description) <= 2000);

alter table public.worlds_relationship_npcs
  drop constraint if exists worlds_relationship_npcs_name_length_check;

alter table public.worlds_relationship_npcs
  add constraint worlds_relationship_npcs_name_length_check
  check (char_length(name) between 1 and 80);

alter table public.worlds_relationship_npcs
  drop constraint if exists worlds_relationship_npcs_description_length_check;

alter table public.worlds_relationship_npcs
  add constraint worlds_relationship_npcs_description_length_check
  check (char_length(description) <= 2000);

alter table public.in_game_worlds_relationship_links
  drop constraint if exists in_game_worlds_relationship_links_in_game_npc_character_key;

alter table public.in_game_worlds_relationship_links
  add constraint in_game_worlds_relationship_links_in_game_npc_character_key
  unique (in_game_npc_id, in_game_character_id);

create or replace function public.create_in_game_relationship_npc(
  p_id uuid,
  p_in_game_world_id uuid,
  p_name text,
  p_description text,
  p_avatar_url text,
  p_sort_order integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_in_game_world_master(p_in_game_world_id) then
    raise exception 'Only the in-game world master can create relationship NPCs';
  end if;

  insert into public.in_game_worlds_relationship_npcs (
    id,
    in_game_world_id,
    name,
    description,
    avatar_url,
    sort_order
  )
  values (
    p_id,
    p_in_game_world_id,
    p_name,
    p_description,
    p_avatar_url,
    p_sort_order
  );

  return p_id;
end;
$$;

revoke all on function public.create_in_game_relationship_npc(
  uuid, uuid, text, text, text, integer
) from public;

grant execute on function public.create_in_game_relationship_npc(
  uuid, uuid, text, text, text, integer
) to authenticated;

create or replace function public.save_in_game_relationship_links(
  p_in_game_world_id uuid,
  p_links jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_in_game_world_master(p_in_game_world_id) then
    raise exception 'Only the in-game world master can save NPC relationships';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_links) as link(
      in_game_npc_id uuid,
      in_game_character_id uuid,
      relationship_value integer,
      is_visible_to_player boolean
    )
    where link.relationship_value not between -5 and 5
      or not exists (
        select 1
        from public.in_game_worlds_relationship_npcs npc
        where npc.id = link.in_game_npc_id
          and npc.in_game_world_id = p_in_game_world_id
      )
      or not exists (
        select 1
        from public.in_game_characters character
        join public.in_game_worlds world
          on world.live_session_id = character.session_id
        where character.id = link.in_game_character_id
          and world.id = p_in_game_world_id
      )
  ) then
    raise exception 'Relationship links must belong to the same in-game world';
  end if;

  insert into public.in_game_worlds_relationship_links (
    in_game_npc_id,
    in_game_character_id,
    relationship_value,
    is_visible_to_player
  )
  select
    link.in_game_npc_id,
    link.in_game_character_id,
    link.relationship_value,
    link.is_visible_to_player
  from jsonb_to_recordset(p_links) as link(
    in_game_npc_id uuid,
    in_game_character_id uuid,
    relationship_value integer,
    is_visible_to_player boolean
  )
  on conflict (in_game_npc_id, in_game_character_id)
  do update set
    relationship_value = excluded.relationship_value,
    is_visible_to_player = excluded.is_visible_to_player;
end;
$$;

revoke all on function public.save_in_game_relationship_links(uuid, jsonb)
from public;

grant execute on function public.save_in_game_relationship_links(uuid, jsonb)
to authenticated;

create or replace function private.create_relationship_links_for_npc()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.in_game_worlds_relationship_links (
    in_game_npc_id,
    in_game_character_id,
    relationship_value,
    is_visible_to_player
  )
  select
    new.id,
    character.id,
    0,
    false
  from public.in_game_worlds world
  join public.in_game_characters character
    on character.session_id = world.live_session_id
  where world.id = new.in_game_world_id
  on conflict (in_game_npc_id, in_game_character_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_relationship_links_after_npc_insert
  on public.in_game_worlds_relationship_npcs;

create trigger create_relationship_links_after_npc_insert
after insert on public.in_game_worlds_relationship_npcs
for each row execute function private.create_relationship_links_for_npc();

create or replace function private.create_relationship_links_for_character()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.in_game_worlds_relationship_links (
    in_game_npc_id,
    in_game_character_id,
    relationship_value,
    is_visible_to_player
  )
  select
    npc.id,
    new.id,
    0,
    false
  from public.in_game_worlds world
  join public.in_game_worlds_relationship_npcs npc
    on npc.in_game_world_id = world.id
  where world.live_session_id = new.session_id
  on conflict (in_game_npc_id, in_game_character_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_relationship_links_after_character_insert
  on public.in_game_characters;

create trigger create_relationship_links_after_character_insert
after insert on public.in_game_characters
for each row execute function private.create_relationship_links_for_character();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'relationship-npc-images',
  'relationship-npc-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists relationship_npc_images_select on storage.objects;
create policy relationship_npc_images_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'relationship-npc-images'
  and exists (
    select 1
    from public.in_game_worlds_relationship_npcs npc
    where npc.avatar_url = storage.objects.name
      and private.can_read_in_game_relationship_npc(npc.id)
  )
);

drop policy if exists relationship_npc_images_insert_master on storage.objects;
create policy relationship_npc_images_insert_master
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'relationship-npc-images'
  and (storage.foldername(name))[1] = 'in-game-worlds'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.is_in_game_world_master(((storage.foldername(name))[2])::uuid)
);

drop policy if exists relationship_npc_images_update_master on storage.objects;
create policy relationship_npc_images_update_master
on storage.objects
for update
to authenticated
using (
  bucket_id = 'relationship-npc-images'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.is_in_game_world_master(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'relationship-npc-images'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.is_in_game_world_master(((storage.foldername(name))[2])::uuid)
);

drop policy if exists relationship_npc_images_delete_master on storage.objects;
create policy relationship_npc_images_delete_master
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'relationship-npc-images'
  and (
    exists (
      select 1
      from public.in_game_worlds_relationship_npcs npc
      where npc.avatar_url = storage.objects.name
        and private.is_in_game_world_master(npc.in_game_world_id)
    )
    or exists (
      select 1
      from public.in_game_worlds_relationship_npcs npc
      join public.worlds_relationship_npcs source_npc
        on source_npc.id = npc.source_relationship_npc_id
      where source_npc.avatar_url = storage.objects.name
        and private.is_in_game_world_master(npc.in_game_world_id)
    )
  )
);

commit;

-- Existing empty descriptions remain valid; the master UI requires descriptions
-- for newly created and edited NPCs.
-- The application broadcasts saved changes, so these tables do not need
-- postgres_changes publication for the master page.
