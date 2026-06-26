do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'in_game_worlds_party'
  ) then
    alter publication supabase_realtime add table public.in_game_worlds_party;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'in_game_worlds_party_targets'
  ) then
    alter publication supabase_realtime add table public.in_game_worlds_party_targets;
  end if;
end $$;

drop policy if exists "in_game_worlds_party_update_participants_runtime"
on public.in_game_worlds_party;

create policy "in_game_worlds_party_update_participants_runtime"
  on public.in_game_worlds_party
  for update
  to authenticated
  using (private.is_in_game_world_participant(in_game_world_id))
  with check (private.is_in_game_world_participant(in_game_world_id));

alter table public.in_game_worlds_party_targets enable row level security;

drop policy if exists "in_game_worlds_party_targets_select_participants"
on public.in_game_worlds_party_targets;

create policy "in_game_worlds_party_targets_select_participants"
  on public.in_game_worlds_party_targets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.in_game_worlds_party party
      where party.id = in_game_world_party_id
        and private.is_in_game_world_participant(party.in_game_world_id)
    )
  );

drop policy if exists "in_game_worlds_party_targets_insert_master"
on public.in_game_worlds_party_targets;

create policy "in_game_worlds_party_targets_insert_master"
  on public.in_game_worlds_party_targets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.in_game_worlds_party party
      where party.id = in_game_world_party_id
        and private.is_in_game_world_master(party.in_game_world_id)
    )
  );

drop policy if exists "in_game_worlds_party_targets_delete_master"
on public.in_game_worlds_party_targets;

create policy "in_game_worlds_party_targets_delete_master"
  on public.in_game_worlds_party_targets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.in_game_worlds_party party
      where party.id = in_game_world_party_id
        and private.is_in_game_world_master(party.in_game_world_id)
    )
  );
