'use client';

import TabletNotesPage from '@/components/tablet/pages/shared/TabletNotesPage';
import type { TabletNote } from '@/features/tablet/notes/types';
import type { StudioCharacterNote } from '@/features/studio/player/types';

export default function StudioNotesPage({ notes, onChange, draftId }: { notes: StudioCharacterNote[]; onChange: (notes: StudioCharacterNote[]) => void; draftId: string }) {
  const tabletNotes: TabletNote[] = notes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    x: note.positionX,
    y: note.positionY,
  }));

  return (
    <TabletNotesPage
      draftNotes={tabletNotes}
      cameraStorageKey={`vitruvius:studio-character-notes-camera:${draftId}`}
      onDraftNotesChange={(nextNotes) => onChange(nextNotes.map((note, index) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        positionX: note.x,
        positionY: note.y,
        sortOrder: index,
      })))}
    />
  );
}
