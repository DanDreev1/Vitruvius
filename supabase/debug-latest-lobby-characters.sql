-- Diagnostic helper for Supabase SQL Editor.
-- Shows whether the latest lobby has player participants and matching in-game characters.

with latest_session as (
  select id, code, phase, created_at
  from public.live_sessions
  order by created_at desc
  limit 1
),
participant_counts as (
  select
    session_id,
    count(*) filter (where role = 'master') as master_count,
    count(*) filter (where role = 'player') as player_count,
    count(*) as participant_count
  from public.session_participants
  where session_id in (select id from latest_session)
  group by session_id
),
character_counts as (
  select
    session_id,
    count(*) as in_game_character_count
  from public.in_game_characters
  where session_id in (select id from latest_session)
  group by session_id
)
select
  latest_session.id as session_id,
  latest_session.code,
  latest_session.phase,
  coalesce(participant_counts.master_count, 0) as master_count,
  coalesce(participant_counts.player_count, 0) as player_count,
  coalesce(participant_counts.participant_count, 0) as participant_count,
  coalesce(character_counts.in_game_character_count, 0) as in_game_character_count
from latest_session
left join participant_counts on participant_counts.session_id = latest_session.id
left join character_counts on character_counts.session_id = latest_session.id;

select
  participant.id,
  participant.session_id,
  participant.user_id,
  participant.role,
  participant.display_name,
  participant.selected_character_id
from public.session_participants participant
where participant.session_id = (
  select id
  from public.live_sessions
  order by created_at desc
  limit 1
)
order by participant.joined_at;

select
  character.id,
  character.session_id,
  character.participant_id,
  character.user_id,
  character.source_character_id,
  character.name,
  character.is_placeholder,
  character.save_status
from public.in_game_characters character
where character.session_id = (
  select id
  from public.live_sessions
  order by created_at desc
  limit 1
)
order by character.created_at;
