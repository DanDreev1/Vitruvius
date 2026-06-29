begin;

create table if not exists public.worlds_assets (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  asset_key uuid not null default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null default 'other',
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worlds_assets_asset_key_key unique (asset_key),
  constraint worlds_assets_name_check check (char_length(name) between 1 and 80),
  constraint worlds_assets_description_check check (char_length(description) between 1 and 2000),
  constraint worlds_assets_category_check check (category in ('weapon', 'consumable', 'quest', 'other'))
);

create table if not exists public.in_game_worlds_assets (
  id uuid primary key default gen_random_uuid(),
  in_game_world_id uuid not null references public.in_game_worlds(id) on delete cascade,
  source_asset_id uuid references public.worlds_assets(id) on delete set null,
  asset_key uuid not null default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null default 'other',
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint in_game_worlds_assets_asset_key_key unique (asset_key),
  constraint in_game_worlds_assets_name_check check (char_length(name) between 1 and 80),
  constraint in_game_worlds_assets_description_check check (char_length(description) between 1 and 2000),
  constraint in_game_worlds_assets_category_check check (category in ('weapon', 'consumable', 'quest', 'other'))
);

alter table public.character_inventory_items
  add column if not exists asset_key uuid;

alter table public.in_game_character_inventory_items
  add column if not exists asset_key uuid;

alter table public.character_inventory_items
  alter column category set default 'other';

alter table public.in_game_character_inventory_items
  alter column category set default 'other';

alter table public.character_inventory_items
  drop constraint if exists character_inventory_items_category_check;
alter table public.character_inventory_items
  add constraint character_inventory_items_category_check
  check (category in ('weapon', 'consumable', 'quest', 'other'));

alter table public.in_game_character_inventory_items
  drop constraint if exists in_game_character_inventory_items_category_check;
alter table public.in_game_character_inventory_items
  add constraint in_game_character_inventory_items_category_check
  check (category in ('weapon', 'consumable', 'quest', 'other'));

alter table public.character_inventory_items
  drop constraint if exists character_inventory_items_quantity_check;
alter table public.character_inventory_items
  add constraint character_inventory_items_quantity_check
  check (quantity between 1 and 999 and (category = 'consumable' or quantity = 1));

alter table public.in_game_character_inventory_items
  drop constraint if exists in_game_character_inventory_items_quantity_check;
alter table public.in_game_character_inventory_items
  add constraint in_game_character_inventory_items_quantity_check
  check (quantity between 1 and 999 and (category = 'consumable' or quantity = 1));

create unique index if not exists character_inventory_consumable_stack_key
  on public.character_inventory_items(character_id, asset_key)
  where category = 'consumable' and asset_key is not null;

create unique index if not exists in_game_inventory_consumable_stack_key
  on public.in_game_character_inventory_items(in_game_character_id, asset_key)
  where category = 'consumable' and asset_key is not null;

create table if not exists public.character_inventory_item_visibility (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.character_inventory_items(id) on delete cascade,
  viewer_character_id uuid not null references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint character_inventory_item_visibility_key unique (inventory_item_id, viewer_character_id)
);

create table if not exists public.in_game_character_inventory_item_visibility (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.in_game_character_inventory_items(id) on delete cascade,
  viewer_in_game_character_id uuid not null references public.in_game_characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint in_game_character_inventory_item_visibility_key unique (inventory_item_id, viewer_in_game_character_id)
);

create index if not exists idx_worlds_assets_world on public.worlds_assets(world_id, sort_order);
create index if not exists idx_in_game_worlds_assets_world on public.in_game_worlds_assets(in_game_world_id, sort_order);
create index if not exists idx_inventory_visibility_viewer on public.in_game_character_inventory_item_visibility(viewer_in_game_character_id);

drop trigger if exists set_updated_at on public.worlds_assets;
create trigger set_updated_at before update on public.worlds_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.in_game_worlds_assets;
create trigger set_updated_at before update on public.in_game_worlds_assets
for each row execute function public.set_updated_at();

alter table public.worlds_assets enable row level security;
alter table public.in_game_worlds_assets enable row level security;
alter table public.character_inventory_item_visibility enable row level security;
alter table public.in_game_character_inventory_item_visibility enable row level security;

drop policy if exists worlds_assets_owner_all on public.worlds_assets;
create policy worlds_assets_owner_all on public.worlds_assets
for all to authenticated
using (exists (select 1 from public.worlds w where w.id = public.worlds_assets.world_id and w.owner_user_id = auth.uid()))
with check (exists (select 1 from public.worlds w where w.id = public.worlds_assets.world_id and w.owner_user_id = auth.uid()));

drop policy if exists in_game_worlds_assets_master_all on public.in_game_worlds_assets;
create policy in_game_worlds_assets_master_all on public.in_game_worlds_assets
for all to authenticated
using (private.is_in_game_world_master(in_game_world_id))
with check (private.is_in_game_world_master(in_game_world_id));

create or replace function private.can_read_in_game_inventory_item(p_item_id uuid)
returns boolean
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.in_game_character_inventory_items item
    where item.id = p_item_id
      and (
        public.can_edit_in_game_character(item.in_game_character_id)
        or exists (
          select 1
          from public.in_game_character_inventory_item_visibility visibility
          where visibility.inventory_item_id = item.id
            and private.owns_in_game_character(visibility.viewer_in_game_character_id)
        )
      )
  );
$$;

drop policy if exists in_game_character_inventory_items_session_select
  on public.in_game_character_inventory_items;
drop policy if exists in_game_character_inventory_items_visible_select
  on public.in_game_character_inventory_items;
create policy in_game_character_inventory_items_visible_select
on public.in_game_character_inventory_items
for select to authenticated
using (private.can_read_in_game_inventory_item(id));

drop policy if exists inventory_visibility_saved_owner on public.character_inventory_item_visibility;
create policy inventory_visibility_saved_owner
on public.character_inventory_item_visibility
for all to authenticated
using (
  exists (
    select 1 from public.character_inventory_items item
    where item.id = inventory_item_id and public.can_read_saved_character(item.character_id)
  )
)
with check (
  exists (
    select 1 from public.character_inventory_items item
    where item.id = inventory_item_id and public.can_read_saved_character(item.character_id)
  )
);

drop policy if exists inventory_visibility_runtime_select on public.in_game_character_inventory_item_visibility;
create policy inventory_visibility_runtime_select
on public.in_game_character_inventory_item_visibility
for select to authenticated
using (
  private.owns_in_game_character(viewer_in_game_character_id)
  or exists (
    select 1 from public.in_game_character_inventory_items item
    where item.id = inventory_item_id and public.can_edit_in_game_character(item.in_game_character_id)
  )
);

drop policy if exists inventory_visibility_runtime_edit on public.in_game_character_inventory_item_visibility;
create policy inventory_visibility_runtime_edit
on public.in_game_character_inventory_item_visibility
for all to authenticated
using (
  exists (
    select 1 from public.in_game_character_inventory_items item
    where item.id = inventory_item_id and public.can_edit_in_game_character(item.in_game_character_id)
  )
)
with check (
  exists (
    select 1 from public.in_game_character_inventory_items item
    where item.id = inventory_item_id and public.can_edit_in_game_character(item.in_game_character_id)
  )
);

create or replace function public.grant_world_asset(
  p_asset_id uuid,
  p_character_ids uuid[],
  p_quantity integer default 1
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  asset public.in_game_worlds_assets%rowtype;
  target_id uuid;
  existing_item public.in_game_character_inventory_items%rowtype;
  granted integer;
  result jsonb := '[]'::jsonb;
begin
  select * into asset from public.in_game_worlds_assets where id = p_asset_id;
  if asset.id is null or not private.is_in_game_world_master(asset.in_game_world_id) then
    raise exception 'Asset is unavailable';
  end if;

  foreach target_id in array p_character_ids loop
    if not exists (
      select 1 from public.in_game_characters character
      join public.in_game_worlds world on world.live_session_id = character.session_id
      where character.id = target_id and world.id = asset.in_game_world_id
    ) then continue; end if;

    if asset.category = 'consumable' then
      select * into existing_item
      from public.in_game_character_inventory_items
      where in_game_character_id = target_id and asset_key = asset.asset_key and category = 'consumable'
      for update;
      granted := least(greatest(p_quantity, 1), 999 - coalesce(existing_item.quantity, 0));
      if granted > 0 and existing_item.id is not null then
        update public.in_game_character_inventory_items set
          quantity = quantity + granted,
          name = asset.name,
          description = asset.description,
          image_url = asset.image_url
        where id = existing_item.id;
      elsif granted > 0 then
        insert into public.in_game_character_inventory_items (
          in_game_character_id, asset_key, name, description, category, quantity, image_url, sort_order
        ) values (
          target_id, asset.asset_key, asset.name, asset.description, asset.category, granted,
          asset.image_url,
          coalesce((select max(sort_order) + 1 from public.in_game_character_inventory_items where in_game_character_id = target_id), 0)
        );
      end if;
    else
      granted := 1;
      insert into public.in_game_character_inventory_items (
        in_game_character_id, asset_key, name, description, category, quantity, image_url, sort_order
      ) values (
        target_id, asset.asset_key, asset.name, asset.description, asset.category, 1,
        asset.image_url,
        coalesce((select max(sort_order) + 1 from public.in_game_character_inventory_items where in_game_character_id = target_id), 0)
      );
    end if;
    result := result || jsonb_build_object('characterId', target_id, 'quantity', granted);
  end loop;
  return result;
end;
$$;

create or replace function public.use_inventory_item(p_item_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare item public.in_game_character_inventory_items%rowtype;
begin
  select * into item from public.in_game_character_inventory_items where id = p_item_id for update;
  if item.id is null or not public.can_edit_in_game_character(item.in_game_character_id) then raise exception 'Item is unavailable'; end if;
  if item.category = 'consumable' then
    if item.quantity <= 1 then delete from public.in_game_character_inventory_items where id = item.id;
    else update public.in_game_character_inventory_items set quantity = quantity - 1 where id = item.id; end if;
  end if;
  return jsonb_build_object('itemName', item.name, 'category', item.category, 'ownerCharacterId', item.in_game_character_id);
end;
$$;

create or replace function public.discard_inventory_item(p_item_id uuid, p_quantity integer default 1)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare item public.in_game_character_inventory_items%rowtype; removed integer;
begin
  select * into item from public.in_game_character_inventory_items where id = p_item_id for update;
  if item.id is null or not public.can_edit_in_game_character(item.in_game_character_id) then raise exception 'Item is unavailable'; end if;
  removed := case when item.category = 'consumable' then least(greatest(p_quantity, 1), item.quantity) else 1 end;
  if removed >= item.quantity then delete from public.in_game_character_inventory_items where id = item.id;
  else update public.in_game_character_inventory_items set quantity = quantity - removed where id = item.id; end if;
  return jsonb_build_object('itemName', item.name, 'quantity', removed, 'ownerCharacterId', item.in_game_character_id);
end;
$$;

create or replace function public.transfer_inventory_item(p_item_id uuid, p_recipient_character_id uuid, p_quantity integer default 1)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare item public.in_game_character_inventory_items%rowtype; recipient_item public.in_game_character_inventory_items%rowtype; moved integer;
begin
  select * into item from public.in_game_character_inventory_items where id = p_item_id for update;
  if item.id is null or not public.can_edit_in_game_character(item.in_game_character_id) then raise exception 'Item is unavailable'; end if;
  if item.in_game_character_id = p_recipient_character_id or not exists (
    select 1 from public.in_game_characters source
    join public.in_game_characters recipient on recipient.session_id = source.session_id
    where source.id = item.in_game_character_id and recipient.id = p_recipient_character_id
  ) then raise exception 'Recipient is unavailable'; end if;

  if item.category = 'consumable' then
    select * into recipient_item from public.in_game_character_inventory_items
    where in_game_character_id = p_recipient_character_id and asset_key = item.asset_key and category = 'consumable' for update;
    moved := least(greatest(p_quantity, 1), item.quantity, 999 - coalesce(recipient_item.quantity, 0));
    if moved <= 0 then return jsonb_build_object('itemName', item.name, 'quantity', 0); end if;
    if recipient_item.id is null then
      insert into public.in_game_character_inventory_items (
        in_game_character_id, asset_key, name, description, category, quantity, image_url, sort_order, metadata
      ) values (
        p_recipient_character_id, item.asset_key, item.name, item.description, item.category, moved, item.image_url,
        coalesce((select max(sort_order) + 1 from public.in_game_character_inventory_items where in_game_character_id = p_recipient_character_id), 0), item.metadata
      );
    else
      update public.in_game_character_inventory_items set
        quantity = quantity + moved,
        name = item.name,
        description = item.description,
        image_url = item.image_url
      where id = recipient_item.id;
    end if;
  else
    moved := 1;
    update public.in_game_character_inventory_items set in_game_character_id = p_recipient_character_id where id = item.id;
    delete from public.in_game_character_inventory_item_visibility where inventory_item_id = item.id;
    return jsonb_build_object('itemName', item.name, 'quantity', moved, 'ownerCharacterId', item.in_game_character_id, 'recipientCharacterId', p_recipient_character_id);
  end if;
  if moved >= item.quantity then delete from public.in_game_character_inventory_items where id = item.id;
  else update public.in_game_character_inventory_items set quantity = quantity - moved where id = item.id; end if;
  return jsonb_build_object('itemName', item.name, 'quantity', moved, 'ownerCharacterId', item.in_game_character_id, 'recipientCharacterId', p_recipient_character_id);
end;
$$;

create or replace function public.set_inventory_item_visibility(p_item_id uuid, p_viewer_character_ids uuid[])
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare item public.in_game_character_inventory_items%rowtype;
begin
  select * into item from public.in_game_character_inventory_items where id = p_item_id;
  if item.id is null or not public.can_edit_in_game_character(item.in_game_character_id) then raise exception 'Item is unavailable'; end if;
  delete from public.in_game_character_inventory_item_visibility where inventory_item_id = item.id;
  insert into public.in_game_character_inventory_item_visibility(inventory_item_id, viewer_in_game_character_id)
  select item.id, viewer.id
  from public.in_game_characters owner
  join public.in_game_characters viewer on viewer.session_id = owner.session_id
  where owner.id = item.in_game_character_id
    and viewer.id = any(p_viewer_character_ids)
    and viewer.id <> owner.id
  on conflict do nothing;
end;
$$;

revoke all on function public.grant_world_asset(uuid, uuid[], integer) from public;
revoke all on function public.use_inventory_item(uuid) from public;
revoke all on function public.discard_inventory_item(uuid, integer) from public;
revoke all on function public.transfer_inventory_item(uuid, uuid, integer) from public;
revoke all on function public.set_inventory_item_visibility(uuid, uuid[]) from public;
grant execute on function public.grant_world_asset(uuid, uuid[], integer) to authenticated;
grant execute on function public.use_inventory_item(uuid) to authenticated;
grant execute on function public.discard_inventory_item(uuid, integer) to authenticated;
grant execute on function public.transfer_inventory_item(uuid, uuid, integer) to authenticated;
grant execute on function public.set_inventory_item_visibility(uuid, uuid[]) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('asset-images', 'asset-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists asset_images_master_insert on storage.objects;
create policy asset_images_master_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'asset-images'
  and (storage.foldername(name))[1] = 'in-game-worlds'
  and private.is_in_game_world_master(((storage.foldername(name))[2])::uuid)
);

drop policy if exists asset_images_select on storage.objects;
create policy asset_images_select on storage.objects for select to authenticated
using (
  bucket_id = 'asset-images' and (
    exists (select 1 from public.in_game_worlds_assets asset where asset.image_url = storage.objects.name and private.is_in_game_world_master(asset.in_game_world_id))
    or exists (select 1 from public.in_game_character_inventory_items item where item.image_url = storage.objects.name and private.can_read_in_game_inventory_item(item.id))
  )
);

drop policy if exists asset_images_master_delete on storage.objects;
create policy asset_images_master_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'asset-images'
  and exists (select 1 from public.in_game_worlds_assets asset where asset.image_url = storage.objects.name and private.is_in_game_world_master(asset.in_game_world_id))
);

commit;
