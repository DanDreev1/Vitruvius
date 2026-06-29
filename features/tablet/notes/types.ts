export type NotesOwner =
  | { kind: 'master'; id: string }
  | { kind: 'player'; id: string };

export type TabletNote = {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
};

export type NoteDraft = Pick<TabletNote, 'title' | 'content'>;
