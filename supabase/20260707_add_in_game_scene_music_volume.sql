alter table public.in_game_worlds_scene_music
  add column if not exists volume numeric not null default 1;

update public.in_game_worlds_scene_music
set volume = 1
where volume is null;

alter table public.in_game_worlds_scene_music
  drop constraint if exists in_game_worlds_scene_music_volume_range;

alter table public.in_game_worlds_scene_music
  add constraint in_game_worlds_scene_music_volume_range
  check (volume >= 0 and volume <= 1);
