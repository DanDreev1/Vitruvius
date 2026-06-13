-- Character-only RLS policies.
-- This file intentionally does not create/drop policies for live_sessions,
-- session_participants, worlds, or any non-character table.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
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
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.characters to authenticated;
grant select, insert, update, delete on table public.character_attributes to authenticated;
grant select, insert, update, delete on table public.character_parameters to authenticated;
grant select, insert, update, delete on table public.character_domains to authenticated;
grant select, insert, update, delete on table public.character_domain_skills to authenticated;
grant select, insert, update, delete on table public.character_inventory_items to authenticated;
grant select, insert, update, delete on table public.character_notes to authenticated;
grant select, insert, update, delete on table public.character_experiences to authenticated;
grant select, insert, update, delete on table public.in_game_characters to authenticated;
grant select, insert, update, delete on table public.in_game_character_attributes to authenticated;
grant select, insert, update, delete on table public.in_game_character_parameters to authenticated;
grant select, insert, update, delete on table public.in_game_character_domains to authenticated;
grant select, insert, update, delete on table public.in_game_character_domain_skills to authenticated;
grant select, insert, update, delete on table public.in_game_character_inventory_items to authenticated;
grant select, insert, update, delete on table public.in_game_character_notes to authenticated;
grant select, insert, update, delete on table public.in_game_character_experiences to authenticated;

alter table public.characters enable row level security;
alter table public.character_attributes enable row level security;
alter table public.character_parameters enable row level security;
alter table public.character_domains enable row level security;
alter table public.character_domain_skills enable row level security;
alter table public.character_inventory_items enable row level security;
alter table public.character_notes enable row level security;
alter table public.character_experiences enable row level security;
alter table public.in_game_characters enable row level security;
alter table public.in_game_character_attributes enable row level security;
alter table public.in_game_character_parameters enable row level security;
alter table public.in_game_character_domains enable row level security;
alter table public.in_game_character_domain_skills enable row level security;
alter table public.in_game_character_inventory_items enable row level security;
alter table public.in_game_character_notes enable row level security;
alter table public.in_game_character_experiences enable row level security;

create or replace function public.is_session_participant(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.session_participants participant
    where participant.session_id = p_session_id
      and participant.user_id = auth.uid()
  );
$$;

create or replace function public.is_session_master(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.live_sessions live_session
    where live_session.id = p_session_id
      and live_session.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.session_participants participant
    where participant.session_id = p_session_id
      and participant.user_id = auth.uid()
      and participant.role = 'master'
  );
$$;

create or replace function public.owns_character(p_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.characters saved_character
    where saved_character.id = p_character_id
      and saved_character.owner_user_id = auth.uid()
  );
$$;

create or replace function public.can_read_saved_character(p_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.owns_character(p_character_id)
  or exists (
    select 1
    from public.session_participants participant
    where participant.selected_character_id = p_character_id
      and public.is_session_master(participant.session_id)
  );
$$;

create or replace function public.can_access_in_game_character(p_in_game_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.in_game_characters game_character
    where game_character.id = p_in_game_character_id
      and (
        game_character.user_id = auth.uid()
        or public.is_session_participant(game_character.session_id)
      )
  );
$$;

create or replace function public.can_edit_in_game_character(p_in_game_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.in_game_characters game_character
    where game_character.id = p_in_game_character_id
      and (
        game_character.user_id = auth.uid()
        or public.is_session_master(game_character.session_id)
      )
  );
$$;

grant execute on function public.is_session_participant(uuid) to authenticated;
grant execute on function public.is_session_master(uuid) to authenticated;
grant execute on function public.owns_character(uuid) to authenticated;
grant execute on function public.can_read_saved_character(uuid) to authenticated;
grant execute on function public.can_access_in_game_character(uuid) to authenticated;
grant execute on function public.can_edit_in_game_character(uuid) to authenticated;

create policy characters_owner_all
on public.characters
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy characters_selected_master_select
on public.characters
for select
to authenticated
using (public.can_read_saved_character(id));

create policy character_attributes_owner_all
on public.character_attributes
for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create policy character_attributes_selected_master_select
on public.character_attributes
for select
to authenticated
using (public.can_read_saved_character(character_id));

create policy character_parameters_owner_all
on public.character_parameters
for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create policy character_parameters_selected_master_select
on public.character_parameters
for select
to authenticated
using (public.can_read_saved_character(character_id));

create policy character_domains_owner_all
on public.character_domains
for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create policy character_domains_selected_master_select
on public.character_domains
for select
to authenticated
using (public.can_read_saved_character(character_id));

create policy character_domain_skills_owner_all
on public.character_domain_skills
for all
to authenticated
using (
  exists (
    select 1
    from public.character_domains domain
    where domain.id = domain_id
      and public.owns_character(domain.character_id)
  )
)
with check (
  exists (
    select 1
    from public.character_domains domain
    where domain.id = domain_id
      and public.owns_character(domain.character_id)
  )
);

create policy character_domain_skills_selected_master_select
on public.character_domain_skills
for select
to authenticated
using (
  exists (
    select 1
    from public.character_domains domain
    where domain.id = domain_id
      and public.can_read_saved_character(domain.character_id)
  )
);

create policy character_inventory_items_owner_all
on public.character_inventory_items
for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create policy character_inventory_items_selected_master_select
on public.character_inventory_items
for select
to authenticated
using (public.can_read_saved_character(character_id));

create policy character_notes_owner_all
on public.character_notes
for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create policy character_notes_selected_master_select
on public.character_notes
for select
to authenticated
using (public.can_read_saved_character(character_id));

create policy character_experiences_owner_all
on public.character_experiences
for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create policy character_experiences_selected_master_select
on public.character_experiences
for select
to authenticated
using (public.can_read_saved_character(character_id));

create policy in_game_characters_session_select
on public.in_game_characters
for select
to authenticated
using (public.is_session_participant(session_id));

create policy in_game_characters_owner_or_master_insert
on public.in_game_characters
for insert
to authenticated
with check (user_id = auth.uid() or public.is_session_master(session_id));

create policy in_game_characters_owner_or_master_update
on public.in_game_characters
for update
to authenticated
using (user_id = auth.uid() or public.is_session_master(session_id))
with check (user_id = auth.uid() or public.is_session_master(session_id));

create policy in_game_characters_owner_or_master_delete
on public.in_game_characters
for delete
to authenticated
using (user_id = auth.uid() or public.is_session_master(session_id));

create policy in_game_character_attributes_session_select
on public.in_game_character_attributes
for select
to authenticated
using (public.can_access_in_game_character(in_game_character_id));

create policy in_game_character_attributes_owner_or_master_all
on public.in_game_character_attributes
for all
to authenticated
using (public.can_edit_in_game_character(in_game_character_id))
with check (public.can_edit_in_game_character(in_game_character_id));

create policy in_game_character_parameters_session_select
on public.in_game_character_parameters
for select
to authenticated
using (public.can_access_in_game_character(in_game_character_id));

create policy in_game_character_parameters_owner_or_master_all
on public.in_game_character_parameters
for all
to authenticated
using (public.can_edit_in_game_character(in_game_character_id))
with check (public.can_edit_in_game_character(in_game_character_id));

create policy in_game_character_domains_session_select
on public.in_game_character_domains
for select
to authenticated
using (public.can_access_in_game_character(in_game_character_id));

create policy in_game_character_domains_owner_or_master_all
on public.in_game_character_domains
for all
to authenticated
using (public.can_edit_in_game_character(in_game_character_id))
with check (public.can_edit_in_game_character(in_game_character_id));

create policy in_game_character_domain_skills_session_select
on public.in_game_character_domain_skills
for select
to authenticated
using (
  exists (
    select 1
    from public.in_game_character_domains domain
    where domain.id = in_game_domain_id
      and public.can_access_in_game_character(domain.in_game_character_id)
  )
);

create policy in_game_character_domain_skills_owner_or_master_all
on public.in_game_character_domain_skills
for all
to authenticated
using (
  exists (
    select 1
    from public.in_game_character_domains domain
    where domain.id = in_game_domain_id
      and public.can_edit_in_game_character(domain.in_game_character_id)
  )
)
with check (
  exists (
    select 1
    from public.in_game_character_domains domain
    where domain.id = in_game_domain_id
      and public.can_edit_in_game_character(domain.in_game_character_id)
  )
);

create policy in_game_character_inventory_items_session_select
on public.in_game_character_inventory_items
for select
to authenticated
using (public.can_access_in_game_character(in_game_character_id));

create policy in_game_character_inventory_items_owner_or_master_all
on public.in_game_character_inventory_items
for all
to authenticated
using (public.can_edit_in_game_character(in_game_character_id))
with check (public.can_edit_in_game_character(in_game_character_id));

create policy in_game_character_notes_session_select
on public.in_game_character_notes
for select
to authenticated
using (public.can_access_in_game_character(in_game_character_id));

create policy in_game_character_notes_owner_or_master_all
on public.in_game_character_notes
for all
to authenticated
using (public.can_edit_in_game_character(in_game_character_id))
with check (public.can_edit_in_game_character(in_game_character_id));

create policy in_game_character_experiences_session_select
on public.in_game_character_experiences
for select
to authenticated
using (public.can_access_in_game_character(in_game_character_id));

create policy in_game_character_experiences_owner_or_master_all
on public.in_game_character_experiences
for all
to authenticated
using (public.can_edit_in_game_character(in_game_character_id))
with check (public.can_edit_in_game_character(in_game_character_id));
