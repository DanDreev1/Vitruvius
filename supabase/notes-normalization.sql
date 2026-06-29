-- Normalize note payload columns across saved and in-game worlds/characters.
-- Existing values are preserved because columns are renamed, not recreated.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'worlds_notes' and column_name = 'description'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'worlds_notes' and column_name = 'content'
  ) then
    alter table public.worlds_notes rename column description to content;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'in_game_worlds_notes' and column_name = 'description'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'in_game_worlds_notes' and column_name = 'content'
  ) then
    alter table public.in_game_worlds_notes rename column description to content;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'character_notes' and column_name = 'canvas_x'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'character_notes' and column_name = 'position_x'
  ) then
    alter table public.character_notes rename column canvas_x to position_x;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'character_notes' and column_name = 'canvas_y'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'character_notes' and column_name = 'position_y'
  ) then
    alter table public.character_notes rename column canvas_y to position_y;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'in_game_character_notes' and column_name = 'canvas_x'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'in_game_character_notes' and column_name = 'position_x'
  ) then
    alter table public.in_game_character_notes rename column canvas_x to position_x;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'in_game_character_notes' and column_name = 'canvas_y'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'in_game_character_notes' and column_name = 'position_y'
  ) then
    alter table public.in_game_character_notes rename column canvas_y to position_y;
  end if;
end
$$;
