'use client';

import { useMemo, useState } from 'react';

import {
  deleteTabletPlayerExperience,
  saveTabletPlayerExperiences,
} from '@/features/tablet/player/api';
import type {
  TabletPlayerCharacter,
  TabletPlayerExperience,
} from '@/features/tablet/player/types';

type TabletLibraryPageProps = {
  isEditable: boolean;
  character: TabletPlayerCharacter | null;
  isLoading: boolean;
  error: string | null;
  onExperiencesSaved?: (experiences: TabletPlayerExperience[]) => void;
};

type TabletLibraryEditorProps = TabletLibraryPageProps & {
  initialEntries: TabletPlayerExperience[];
};

type LibrarySortMode = 'manual' | 'xp-desc' | 'xp-asc';

const tagOptions = [
  'Battle',
  'Quest',
  'Discovery',
  'Roleplay',
  'Mystery',
  'Travel',
  'Lore',
  'Treasure',
  'Boss',
  'Other',
];

const placeholderEntryContent = {
  headline: 'Headline',
  description: null,
  xp: 1,
  tag: 'Battle',
  sessionLabel: '1',
  happenedAt: null,
};

function createDraftId() {
  return `draft-experience-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createPlaceholderEntry(sortOrder = 0): TabletPlayerExperience {
  const id = createDraftId();

  return {
    id,
    ...placeholderEntryContent,
    sortOrder,
    metadata: { client_id: id },
    isDraft: true,
  };
}

function cloneEntry(entry: TabletPlayerExperience): TabletPlayerExperience {
  return {
    ...entry,
    metadata: { ...(entry.metadata ?? {}) },
  };
}

function getClientId(entry: TabletPlayerExperience) {
  const clientId = entry.metadata?.client_id;
  return typeof clientId === 'string' ? clientId : null;
}

function isDraftEntry(entry: TabletPlayerExperience) {
  return entry.isDraft || entry.id.startsWith('draft-');
}

function getInitialEntries(character: TabletPlayerCharacter | null) {
  if (character?.experiences.length) {
    return character.experiences
      .map(cloneEntry)
      .sort((firstEntry, secondEntry) => {
        return firstEntry.sortOrder - secondEntry.sortOrder;
      });
  }

  return [createPlaceholderEntry()];
}

function getComparableEntry(entry: TabletPlayerExperience) {
  const normalizedEntry = normalizeEntry(entry, entry.sortOrder);

  return {
    headline: normalizedEntry.headline,
    description: normalizedEntry.description,
    xp: normalizedEntry.xp,
    tag: normalizedEntry.tag,
    sessionLabel: normalizedEntry.sessionLabel,
    happenedAt: normalizedEntry.happenedAt,
  };
}

function isDefaultDraftEntry(entry: TabletPlayerExperience) {
  const comparableEntry = getComparableEntry(entry);

  return (
    comparableEntry.headline === placeholderEntryContent.headline &&
    comparableEntry.description === placeholderEntryContent.description &&
    comparableEntry.xp === placeholderEntryContent.xp &&
    comparableEntry.tag === placeholderEntryContent.tag &&
    comparableEntry.sessionLabel === placeholderEntryContent.sessionLabel &&
    comparableEntry.happenedAt === placeholderEntryContent.happenedAt
  );
}

function shouldPersistEntry(entry: TabletPlayerExperience) {
  return !isDraftEntry(entry) || !isDefaultDraftEntry(entry);
}

function areEntryContentsEqual(
  firstEntry: TabletPlayerExperience,
  secondEntry: TabletPlayerExperience
) {
  const firstComparableEntry = getComparableEntry(firstEntry);
  const secondComparableEntry = getComparableEntry(secondEntry);

  return (
    firstComparableEntry.headline === secondComparableEntry.headline &&
    firstComparableEntry.description === secondComparableEntry.description &&
    firstComparableEntry.xp === secondComparableEntry.xp &&
    firstComparableEntry.tag === secondComparableEntry.tag &&
    firstComparableEntry.sessionLabel === secondComparableEntry.sessionLabel &&
    firstComparableEntry.happenedAt === secondComparableEntry.happenedAt
  );
}

function haveEntriesChanged(
  initialEntries: TabletPlayerExperience[],
  currentEntries: TabletPlayerExperience[]
) {
  const initialPersistentEntries = initialEntries
    .filter(shouldPersistEntry)
    .map((entry, index) => normalizeEntry(entry, index));
  const currentPersistentEntries = currentEntries
    .filter(shouldPersistEntry)
    .map((entry, index) => normalizeEntry(entry, index));

  if (initialPersistentEntries.length !== currentPersistentEntries.length) {
    return true;
  }

  return currentPersistentEntries.some((currentEntry, index) => {
    const initialEntry = initialPersistentEntries[index];

    return (
      !initialEntry ||
      currentEntry.id !== initialEntry.id ||
      currentEntry.sortOrder !== initialEntry.sortOrder ||
      !areEntryContentsEqual(initialEntry, currentEntry)
    );
  });
}

function getSortedEntries(
  entries: TabletPlayerExperience[],
  sortMode: LibrarySortMode
) {
  if (sortMode === 'xp-desc') {
    return [...entries].sort((firstEntry, secondEntry) => {
      return secondEntry.xp - firstEntry.xp;
    });
  }

  if (sortMode === 'xp-asc') {
    return [...entries].sort((firstEntry, secondEntry) => {
      return firstEntry.xp - secondEntry.xp;
    });
  }

  return entries;
}

function mergeDraftIntoEntries(
  entries: TabletPlayerExperience[],
  draftEntry: TabletPlayerExperience
) {
  if (entries.some((entry) => entry.id === draftEntry.id)) {
    return entries.map((entry) =>
      entry.id === draftEntry.id ? draftEntry : entry
    );
  }

  return [...entries, draftEntry];
}

function normalizeEntry(
  entry: TabletPlayerExperience,
  sortOrder: number
): TabletPlayerExperience {
  return {
    ...entry,
    headline: entry.headline.trim() || 'Headline',
    description: entry.description?.trim() || null,
    xp: Math.max(0, Math.min(99, Math.round(entry.xp) || 0)),
    tag: entry.tag?.trim() || 'Battle',
    sessionLabel: entry.sessionLabel?.trim() || null,
    sortOrder,
    metadata: { ...(entry.metadata ?? {}) },
  };
}

function moveEntryBefore(
  entries: TabletPlayerExperience[],
  sourceEntryId: string,
  targetEntryId: string
) {
  const nextEntries = [...entries];
  const sourceIndex = nextEntries.findIndex((entry) => entry.id === sourceEntryId);
  const targetIndex = nextEntries.findIndex((entry) => entry.id === targetEntryId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return nextEntries;
  }

  const [sourceEntry] = nextEntries.splice(sourceIndex, 1);
  nextEntries.splice(targetIndex, 0, sourceEntry);
  return nextEntries;
}

function moveEntryByStep(
  entries: TabletPlayerExperience[],
  entryId: string,
  direction: -1 | 1
) {
  const sourceIndex = entries.findIndex((entry) => entry.id === entryId);
  const targetIndex = sourceIndex + direction;

  if (
    sourceIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >= entries.length
  ) {
    return entries;
  }

  const nextEntries = [...entries];
  const [sourceEntry] = nextEntries.splice(sourceIndex, 1);
  nextEntries.splice(targetIndex, 0, sourceEntry);
  return nextEntries;
}

function TabletLibraryEditor({
  isEditable,
  character,
  isLoading,
  error,
  onExperiencesSaved,
  initialEntries,
}: TabletLibraryEditorProps) {
  const [entries, setEntries] =
    useState<TabletPlayerExperience[]>(initialEntries);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    initialEntries[0]?.id ?? null
  );
  const [draftEntry, setDraftEntry] =
    useState<TabletPlayerExperience>(
      initialEntries[0] ?? createPlaceholderEntry()
    );
  const [sortMode, setSortMode] = useState<LibrarySortMode>('manual');
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const normalizedEntries = useMemo(() => {
    return mergeDraftIntoEntries(entries, draftEntry).map((entry, index) =>
      normalizeEntry(entry, index)
    );
  }, [draftEntry, entries]);
  const saveableEntries = useMemo(() => {
    return normalizedEntries.filter(shouldPersistEntry);
  }, [normalizedEntries]);
  const hasLibraryChanges = useMemo(() => {
    return haveEntriesChanged(initialEntries, normalizedEntries);
  }, [initialEntries, normalizedEntries]);
  const sortedEntries = useMemo(() => {
    return getSortedEntries(entries, sortMode);
  }, [entries, sortMode]);

  const selectedEntry =
    entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null;
  const isBusy = isSaving || isDeleting;
  const isFormDisabled = !isEditable || isLoading || isBusy || Boolean(error);
  const isSaveDisabled =
    isFormDisabled || !selectedEntry || !character || !hasLibraryChanges;
  const isDeleteDisabled = isFormDisabled || !selectedEntry;

  const handleEntrySelect = (entry: TabletPlayerExperience) => {
    setSelectedEntryId(entry.id);
    setDraftEntry(entry);
    setSaveMessage(null);
  };

  const handleEntryAdd = () => {
    const nextEntry = createPlaceholderEntry(entries.length);

    setEntries((currentEntries) => [
      ...mergeDraftIntoEntries(currentEntries, draftEntry)
        .filter(shouldPersistEntry)
        .map((entry, index) => normalizeEntry(entry, index)),
      nextEntry,
    ]);
    setSelectedEntryId(nextEntry.id);
    setDraftEntry(nextEntry);
    setSortMode('manual');
    setSaveMessage(null);
  };

  const handleEntryMove = (entryId: string, direction: -1 | 1) => {
    setEntries((currentEntries) => {
      const visibleEntries = getSortedEntries(
        mergeDraftIntoEntries(currentEntries, draftEntry),
        sortMode
      );
      const nextVisibleEntries = moveEntryByStep(
        visibleEntries,
        entryId,
        direction
      );

      return nextVisibleEntries.map((entry, index) =>
        normalizeEntry(entry, index)
      );
    });
    setSortMode('manual');
    setSaveMessage(null);
  };

  const handleEntryDrop = (targetEntryId: string) => {
    if (!draggedEntryId || draggedEntryId === targetEntryId) {
      setDraggedEntryId(null);
      return;
    }

    setEntries((currentEntries) => {
      const visibleEntries = getSortedEntries(
        mergeDraftIntoEntries(currentEntries, draftEntry),
        sortMode
      );

      return moveEntryBefore(
        visibleEntries,
        draggedEntryId,
        targetEntryId
      ).map((entry, index) => normalizeEntry(entry, index));
    });
    setSelectedEntryId(draggedEntryId);
    setSortMode('manual');
    setDraggedEntryId(null);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!character || isSaving || !hasLibraryChanges) return;

    const selectedClientId = getClientId(draftEntry);

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const savedExperiences = await saveTabletPlayerExperiences(
        character.id,
        saveableEntries
      );
      const nextEntries = savedExperiences.length
        ? savedExperiences.map(cloneEntry)
        : [createPlaceholderEntry()];
      const nextSelectedEntry =
        nextEntries.find((entry) => entry.id === draftEntry.id) ??
        nextEntries.find((entry) => getClientId(entry) === selectedClientId) ??
        nextEntries[0];

      setEntries(nextEntries);
      setSelectedEntryId(nextSelectedEntry.id);
      setDraftEntry(nextSelectedEntry);
      setSortMode('manual');
      setSaveMessage('Saved');
      onExperiencesSaved?.(savedExperiences);
    } catch (saveError) {
      console.error(saveError);
      setSaveMessage('Could not save library entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry || isDeleting) return;

    const nextLocalEntries = mergeDraftIntoEntries(entries, draftEntry).filter(
      (entry) => entry.id !== selectedEntry.id
    );

    if (isDraftEntry(selectedEntry)) {
      const nextEntries = nextLocalEntries.length
        ? nextLocalEntries.map((entry, index) => normalizeEntry(entry, index))
        : [createPlaceholderEntry()];
      const nextSelectedEntry = nextEntries[0];

      setEntries(nextEntries);
      setSelectedEntryId(nextSelectedEntry.id);
      setDraftEntry(nextSelectedEntry);
      setSortMode('manual');
      setSaveMessage(null);
      return;
    }

    if (!character) return;

    setIsDeleting(true);
    setSaveMessage(null);

    try {
      const savedExperiences = await deleteTabletPlayerExperience(
        character.id,
        selectedEntry.id
      );
      const nextEntries = savedExperiences.length
        ? savedExperiences.map(cloneEntry)
        : [createPlaceholderEntry()];
      const nextSelectedEntry = nextEntries[0];

      setEntries(nextEntries);
      setSelectedEntryId(nextSelectedEntry.id);
      setDraftEntry(nextSelectedEntry);
      setSortMode('manual');
      setSaveMessage('Deleted');
      onExperiencesSaved?.(savedExperiences);
    } catch (deleteError) {
      console.error(deleteError);
      setSaveMessage('Could not delete library entry');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_320px] gap-[24px] text-white">
      <section className="flex min-h-0 flex-col">
        <div className="mb-[14px] flex h-[44px] items-center justify-between gap-[14px]">
          <div className="flex rounded-[10px] border border-white/45 p-[3px]">
            {[
              { label: 'Manual', value: 'manual' },
              { label: 'XP high', value: 'xp-desc' },
              { label: 'XP low', value: 'xp-asc' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortMode(option.value as LibrarySortMode)}
                className={[
                  'h-[32px] rounded-[7px] px-[16px] font-montserrat-alt text-[13px] font-extrabold leading-none transition',
                  sortMode === option.value
                    ? 'bg-white text-[#172033]'
                    : 'text-white hover:bg-white/10',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-[10px]">
            <span className="font-montserrat text-[14px] font-semibold text-white/55">
              {entries.length} entries
            </span>
            <button
              type="button"
              onClick={handleEntryAdd}
              disabled={isFormDisabled}
              className="h-[34px] rounded-[8px] border border-white/45 px-[14px] font-montserrat-alt text-[13px] font-extrabold leading-none text-white transition hover:bg-white/10 disabled:opacity-35"
            >
              Add entry
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-[10px] overflow-y-auto pr-[6px]">
          {isLoading ? (
            <div className="rounded-[10px] border border-white/35 px-[16px] py-[18px] font-montserrat text-[16px] font-semibold text-white/65">
              Loading library...
            </div>
          ) : null}

          {sortedEntries.map((entry, index) => {
            const isSelected = entry.id === selectedEntryId;
            const isDragged = entry.id === draggedEntryId;

            return (
              <article
                key={entry.id}
                draggable={!isFormDisabled}
                onDragStart={() => setDraggedEntryId(entry.id)}
                onDragEnd={() => setDraggedEntryId(null)}
                onDragOver={(event) => {
                  if (!isFormDisabled) {
                    event.preventDefault();
                  }
                }}
                onDrop={() => handleEntryDrop(entry.id)}
                className={[
                  'group grid min-h-[82px] grid-cols-[34px_minmax(0,1fr)_86px] items-center gap-[10px] rounded-[10px] border px-[10px] py-[9px] transition',
                  isSelected
                    ? 'border-white bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.22)]'
                    : 'border-white/45 bg-transparent hover:bg-white/[0.04]',
                  isDragged ? 'opacity-55' : '',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => handleEntrySelect(entry)}
                  className="flex h-[48px] w-[28px] cursor-grab items-center justify-center rounded-[8px] border border-white/25 text-white/70 active:cursor-grabbing"
                  aria-label={`Select ${entry.headline}`}
                >
                  <span className="grid grid-cols-2 gap-[3px]">
                    {Array.from({ length: 6 }).map((_, dotIndex) => (
                      <span
                        key={dotIndex}
                        className="h-[3px] w-[3px] rounded-full bg-current"
                      />
                    ))}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEntrySelect(entry)}
                  className="min-w-0 text-left"
                >
                  <h2 className="truncate font-montserrat-alt text-[19px] font-extrabold leading-none text-white">
                    {entry.headline}
                  </h2>
                  <div className="mt-[9px] flex flex-wrap items-center gap-x-[14px] gap-y-[4px] font-montserrat text-[15px] leading-none text-white/80">
                    <span>
                      <strong className="font-montserrat-alt text-white">XP:</strong>{' '}
                      {entry.xp}
                    </span>
                    <span>
                      <strong className="font-montserrat-alt text-white">Tag:</strong>{' '}
                      {entry.tag ?? 'Battle'}
                    </span>
                    <span>
                      <strong className="font-montserrat-alt text-white">
                        Session/Date:
                      </strong>{' '}
                      {entry.sessionLabel ?? '1'}
                    </span>
                  </div>
                </button>

                <div className="flex justify-end gap-[6px]">
                  <button
                    type="button"
                    onClick={() => handleEntryMove(entry.id, -1)}
                    disabled={isFormDisabled || index === 0}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-white/35 font-montserrat-alt text-[18px] font-extrabold leading-none text-white disabled:opacity-30"
                    aria-label={`Move ${entry.headline} up`}
                  >
                    ^
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEntryMove(entry.id, 1)}
                    disabled={isFormDisabled || index === sortedEntries.length - 1}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-white/35 font-montserrat-alt text-[18px] font-extrabold leading-none text-white disabled:opacity-30"
                    aria-label={`Move ${entry.headline} down`}
                  >
                    v
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="rounded-[12px] border border-white p-[16px]">
        <div className="space-y-[10px]">
          <input
            value={draftEntry.headline}
            onChange={(event) => {
              setDraftEntry((currentDraft) => ({
                ...currentDraft,
                headline: event.target.value,
              }));
              setSaveMessage(null);
            }}
            disabled={isFormDisabled}
            className="h-[48px] w-full rounded-[8px] border border-white/15 bg-white px-[14px] font-montserrat text-[15px] font-semibold text-[#172033] outline-none placeholder:text-[#172033]/50 focus:border-white"
            aria-label="Experience headline"
            placeholder="Headline"
          />

          <textarea
            value={draftEntry.description ?? ''}
            onChange={(event) => {
              setDraftEntry((currentDraft) => ({
                ...currentDraft,
                description: event.target.value,
              }));
              setSaveMessage(null);
            }}
            disabled={isFormDisabled}
            className="h-[210px] w-full resize-none rounded-[8px] border border-white/15 bg-white px-[14px] py-[12px] font-montserrat text-[15px] font-semibold leading-[1.25] text-[#172033] outline-none placeholder:text-[#172033]/50 focus:border-white"
            aria-label="Experience description"
            placeholder="Description"
          />

          <div className="grid grid-cols-[118px_minmax(0,1fr)] gap-[10px]">
            <label className="flex items-center gap-[7px] font-montserrat-alt text-[14px] font-extrabold text-white">
              XP
              <input
                type="number"
                min={0}
                max={99}
                value={draftEntry.xp}
                onChange={(event) => {
                  setDraftEntry((currentDraft) => ({
                    ...currentDraft,
                    xp: Math.max(0, Number(event.target.value) || 0),
                  }));
                  setSaveMessage(null);
                }}
                disabled={isFormDisabled}
                className="h-[44px] min-w-[70px] flex-1 rounded-[8px] border border-white/15 bg-white px-[10px] text-center font-montserrat text-[15px] font-semibold text-[#172033] outline-none focus:border-white"
                aria-label="Experience XP"
              />
            </label>

            <label className="flex items-center gap-[7px] font-montserrat-alt text-[14px] font-extrabold text-white">
              Tag
              <select
                value={draftEntry.tag ?? 'Battle'}
                onChange={(event) => {
                  setDraftEntry((currentDraft) => ({
                    ...currentDraft,
                    tag: event.target.value,
                  }));
                  setSaveMessage(null);
                }}
                disabled={isFormDisabled}
                className="h-[44px] min-w-0 flex-1 rounded-[8px] border border-white/15 bg-white px-[10px] font-montserrat text-[15px] font-semibold text-[#172033] outline-none focus:border-white"
                aria-label="Experience tag"
              >
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <input
            value={draftEntry.sessionLabel ?? ''}
            onChange={(event) => {
              setDraftEntry((currentDraft) => ({
                ...currentDraft,
                sessionLabel: event.target.value,
              }));
              setSaveMessage(null);
            }}
            disabled={isFormDisabled}
            className="h-[48px] w-full rounded-[8px] border border-white/15 bg-white px-[14px] font-montserrat text-[15px] font-semibold text-[#172033] outline-none placeholder:text-[#172033]/50 focus:border-white"
            aria-label="Experience session or date"
            placeholder="Session/Date"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaveDisabled}
          className="mt-[42px] h-[48px] w-full rounded-[8px] bg-white font-montserrat-alt text-[15px] font-extrabold text-black transition hover:bg-white/90 disabled:opacity-45"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleteDisabled}
          className="mt-[10px] h-[44px] w-full rounded-[8px] border border-[#FF6B6B] bg-transparent font-montserrat-alt text-[14px] font-extrabold text-[#FFB4B4] transition hover:bg-[#FF6B6B]/10 disabled:opacity-35"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>

        {saveMessage ? (
          <p className="mt-[10px] min-h-[18px] text-center font-montserrat text-[13px] font-semibold text-white/70">
            {saveMessage}
          </p>
        ) : null}
      </aside>
    </div>
  );
}

export default function TabletLibraryPage(props: TabletLibraryPageProps) {
  const initialEntries = useMemo(
    () => getInitialEntries(props.character),
    [props.character]
  );
  const editorKey = useMemo(() => {
    if (!props.character) {
      return 'no-character';
    }

    return [
      props.character.id,
      ...props.character.experiences.map((entry) =>
        [
          entry.id,
          entry.headline,
          entry.description,
          entry.xp,
          entry.tag,
          entry.sessionLabel,
          entry.happenedAt,
          entry.sortOrder,
        ].join(':')
      ),
    ].join('|');
  }, [props.character]);

  return (
    <TabletLibraryEditor
      key={editorKey}
      {...props}
      initialEntries={initialEntries}
    />
  );
}
