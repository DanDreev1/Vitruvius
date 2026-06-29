'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  RELATIONSHIP_NPC_ALLOWED_IMAGE_TYPES,
  RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH,
  RELATIONSHIP_NPC_IMAGE_MAX_BYTES,
  RELATIONSHIP_NPC_NAME_MAX_LENGTH,
  RELATIONSHIP_SORT_SAVE_DELAY_MS,
} from './constants';
import {
  deleteRelationshipNpc,
  getRelationshipAudience,
  getRelationshipAvatarUrl,
  getRelationshipLinks,
  getRelationshipNpcs,
  saveRelationshipChanges,
  saveRelationshipSortOrder,
} from './api';
import type {
  RelationshipAudienceMember,
  RelationshipLinkDraft,
  RelationshipNpcDraft,
} from './types';

function createDraftId() {
  return `relationship-npc-${crypto.randomUUID()}`;
}

function createLinkKey(npcId: string, inGameCharacterId: string) {
  return `${npcId}:${inGameCharacterId}`;
}

function cloneNpcs(npcs: RelationshipNpcDraft[]) {
  return npcs.map((npc) => ({ ...npc, avatarFile: null, avatarPreviewUrl: null }));
}

function cloneLinks(links: Record<string, RelationshipLinkDraft>) {
  return Object.fromEntries(
    Object.entries(links).map(([key, value]) => [key, { ...value }])
  );
}

export function useMasterRelationships({
  sessionId,
  inGameWorldId,
}: {
  sessionId: string;
  inGameWorldId: string | null;
}) {
  const [npcs, setNpcs] = useState<RelationshipNpcDraft[]>([]);
  const [links, setLinks] = useState<Record<string, RelationshipLinkDraft>>({});
  const [baselineNpcs, setBaselineNpcs] = useState<RelationshipNpcDraft[]>([]);
  const [baselineLinks, setBaselineLinks] = useState<Record<string, RelationshipLinkDraft>>({});
  const [audience, setAudience] = useState<RelationshipAudienceMember[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [orderRevision, setOrderRevision] = useState(0);

  const baselineNpcsRef = useRef<RelationshipNpcDraft[]>([]);
  const baselineLinksRef = useRef<Record<string, RelationshipLinkDraft>>({});
  const npcsRef = useRef(npcs);
  const pendingSortRef = useRef(false);
  const sortTimerRef = useRef<number | null>(null);

  useEffect(() => {
    npcsRef.current = npcs;
  }, [npcs]);

  const revokeDraftPreviews = useCallback((drafts: RelationshipNpcDraft[]) => {
    drafts.forEach((draft) => {
      if (draft.avatarPreviewUrl) URL.revokeObjectURL(draft.avatarPreviewUrl);
    });
  }, []);

  const load = useCallback(async () => {
    if (!inGameWorldId) {
      setNpcs([]);
      setLinks({});
      setAudience([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [npcRecords, nextAudience] = await Promise.all([
        getRelationshipNpcs(inGameWorldId),
        getRelationshipAudience(sessionId),
      ]);
      const linkRecords = await getRelationshipLinks(npcRecords.map((npc) => npc.id));
      const displayUrls = await Promise.all(
        npcRecords.map((npc) => getRelationshipAvatarUrl(npc.avatar_url))
      );

      const nextNpcs = npcRecords.map((npc, index) => ({
        id: npc.id,
        persistedId: npc.id,
        sourceRelationshipNpcId: npc.source_relationship_npc_id,
        name: npc.name,
        description: npc.description,
        avatarPath: npc.avatar_url,
        avatarDisplayUrl: displayUrls[index],
        avatarFile: null,
        avatarPreviewUrl: null,
        sortOrder: index,
        isNew: false,
      } satisfies RelationshipNpcDraft));

      const nextLinks: Record<string, RelationshipLinkDraft> = {};
      nextNpcs.forEach((npc) => {
        nextAudience.forEach((member) => {
          const record = linkRecords.find(
            (link) =>
              link.in_game_npc_id === npc.persistedId &&
              (link.in_game_character_id === member.inGameCharacterId ||
                (member.sourceCharacterId && link.character_id === member.sourceCharacterId))
          );

          nextLinks[createLinkKey(npc.id, member.inGameCharacterId)] = {
            id: record?.id ?? null,
            relationshipValue: record?.relationship_value ?? 0,
            isVisibleToPlayer: record?.is_visible_to_player ?? false,
          };
        });
      });

      revokeDraftPreviews(npcsRef.current);
      setNpcs(nextNpcs);
      setLinks(nextLinks);
      setAudience(nextAudience);
      setSelectedCharacterId((current) =>
        current && nextAudience.some((member) => member.inGameCharacterId === current)
          ? current
          : nextAudience[0]?.inGameCharacterId ?? null
      );
      baselineNpcsRef.current = cloneNpcs(nextNpcs);
      baselineLinksRef.current = cloneLinks(nextLinks);
      setBaselineNpcs(cloneNpcs(nextNpcs));
      setBaselineLinks(cloneLinks(nextLinks));
      pendingSortRef.current = false;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load relationships.');
    } finally {
      setIsLoading(false);
    }
  }, [inGameWorldId, revokeDraftPreviews, sessionId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => () => revokeDraftPreviews(npcsRef.current), [revokeDraftPreviews]);

  const flushSortOrder = useCallback(async () => {
    if (!pendingSortRef.current) return;

    const rows = npcsRef.current.flatMap((npc, index) =>
      npc.persistedId ? [{ id: npc.persistedId, sortOrder: index }] : []
    );
    if (!rows.length) return;

    pendingSortRef.current = false;
    try {
      await saveRelationshipSortOrder(sessionId, rows);
      baselineNpcsRef.current = baselineNpcsRef.current
        .slice()
        .sort((left, right) => {
          const leftIndex = rows.find((row) => row.id === left.persistedId)?.sortOrder ?? left.sortOrder;
          const rightIndex = rows.find((row) => row.id === right.persistedId)?.sortOrder ?? right.sortOrder;
          return leftIndex - rightIndex;
        })
        .map((npc, index) => ({ ...npc, sortOrder: index }));
      setBaselineNpcs(cloneNpcs(baselineNpcsRef.current));
      setStatus('NPC order saved.');
    } catch (sortError) {
      pendingSortRef.current = true;
      setError(sortError instanceof Error ? sortError.message : 'Failed to save NPC order.');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!orderRevision || !pendingSortRef.current) return;
    if (sortTimerRef.current) window.clearTimeout(sortTimerRef.current);

    sortTimerRef.current = window.setTimeout(() => {
      sortTimerRef.current = null;
      void flushSortOrder();
    }, RELATIONSHIP_SORT_SAVE_DELAY_MS);

    return () => {
      if (sortTimerRef.current) window.clearTimeout(sortTimerRef.current);
    };
  }, [flushSortOrder, orderRevision]);

  useEffect(() => {
    return () => {
      if (pendingSortRef.current) void flushSortOrder();
    };
  }, [flushSortOrder]);

  useEffect(() => {
    if (!status) return;
    const timeoutId = window.setTimeout(() => setStatus(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const beginEditing = useCallback(() => {
    setError(null);
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    revokeDraftPreviews(npcsRef.current);
    setNpcs(cloneNpcs(baselineNpcsRef.current));
    setLinks(cloneLinks(baselineLinksRef.current));
    setError(null);
    setIsEditing(false);
  }, [revokeDraftPreviews]);

  const addNpc = useCallback(() => {
    const id = createDraftId();
    const nextNpc: RelationshipNpcDraft = {
      id,
      persistedId: null,
      sourceRelationshipNpcId: null,
      name: '',
      description: '',
      avatarPath: null,
      avatarDisplayUrl: null,
      avatarFile: null,
      avatarPreviewUrl: null,
      sortOrder: npcsRef.current.length,
      isNew: true,
    };

    setNpcs((current) => [...current, nextNpc]);
    setLinks((current) => {
      const next = { ...current };
      audience.forEach((member) => {
        next[createLinkKey(id, member.inGameCharacterId)] = {
          id: null,
          relationshipValue: 0,
          isVisibleToPlayer: false,
        };
      });
      return next;
    });
    setIsEditing(true);
    return id;
  }, [audience]);

  const updateNpc = useCallback((npcId: string, patch: Partial<RelationshipNpcDraft>) => {
    setNpcs((current) =>
      current.map((npc) => (npc.id === npcId ? { ...npc, ...patch } : npc))
    );
  }, []);

  const selectNpcImage = useCallback((npcId: string, file: File | null) => {
    if (!file) return;
    if (!RELATIONSHIP_NPC_ALLOWED_IMAGE_TYPES.includes(file.type as never)) {
      setError('NPC image must be a JPEG, PNG, or WebP file.');
      return;
    }
    if (file.size > RELATIONSHIP_NPC_IMAGE_MAX_BYTES) {
      setError('NPC image must be 5 MB or smaller.');
      return;
    }

    setNpcs((current) =>
      current.map((npc) => {
        if (npc.id !== npcId) return npc;
        if (npc.avatarPreviewUrl) URL.revokeObjectURL(npc.avatarPreviewUrl);
        return {
          ...npc,
          avatarFile: file,
          avatarPreviewUrl: URL.createObjectURL(file),
        };
      })
    );
    setError(null);
  }, []);

  const updateSelectedLink = useCallback(
    (npcId: string, patch: Partial<RelationshipLinkDraft>) => {
      if (!selectedCharacterId) return;
      const key = createLinkKey(npcId, selectedCharacterId);
      setLinks((current) => ({
        ...current,
        [key]: {
          id: current[key]?.id ?? null,
          relationshipValue: current[key]?.relationshipValue ?? 0,
          isVisibleToPlayer: current[key]?.isVisibleToPlayer ?? false,
          ...patch,
        },
      }));
    },
    [selectedCharacterId]
  );

  const getSelectedLink = useCallback(
    (npcId: string) => {
      if (!selectedCharacterId) return null;
      return links[createLinkKey(npcId, selectedCharacterId)] ?? {
        id: null,
        relationshipValue: 0,
        isVisibleToPlayer: false,
      };
    },
    [links, selectedCharacterId]
  );

  const moveNpc = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setNpcs((current) => {
      const fromIndex = current.findIndex((npc) => npc.id === draggedId);
      const toIndex = current.findIndex((npc) => npc.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragged);
      return next.map((npc, index) => ({ ...npc, sortOrder: index }));
    });
    pendingSortRef.current = true;
    setOrderRevision((value) => value + 1);
  }, []);

  const validate = useCallback(() => {
    for (const npc of npcs) {
      if (!npc.name.trim()) return 'Every NPC needs a name.';
      if (npc.name.trim().length > RELATIONSHIP_NPC_NAME_MAX_LENGTH) {
        return `NPC names cannot exceed ${RELATIONSHIP_NPC_NAME_MAX_LENGTH} characters.`;
      }
      if (!npc.description.trim()) return `A description is required for ${npc.name.trim()}.`;
      if (npc.description.trim().length > RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH) {
        return `NPC descriptions cannot exceed ${RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH} characters.`;
      }
      if (!npc.avatarPath && !npc.avatarFile) return `An image is required for ${npc.name.trim()}.`;
    }
    return null;
  }, [npcs]);

  const save = useCallback(async () => {
    if (!inGameWorldId) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (sortTimerRef.current) window.clearTimeout(sortTimerRef.current);
      pendingSortRef.current = false;

      await saveRelationshipChanges({
        inGameWorldId,
        sessionId,
        npcs: npcs.map((npc, index) => ({
          draftId: npc.id,
          persistedId: npc.persistedId,
          name: npc.name.trim(),
          description: npc.description.trim(),
          avatarPath: npc.avatarPath,
          avatarFile: npc.avatarFile,
          sortOrder: index,
        })),
        audience,
        links,
      });
      await load();
      setIsEditing(false);
      setStatus('Relationships saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save relationships.');
    } finally {
      setIsSaving(false);
    }
  }, [audience, inGameWorldId, links, load, npcs, sessionId, validate]);

  const removeNpc = useCallback(async (npcId: string) => {
    const npc = npcsRef.current.find((item) => item.id === npcId);
    if (!npc) return;

    if (!npc.persistedId) {
      if (npc.avatarPreviewUrl) URL.revokeObjectURL(npc.avatarPreviewUrl);
      setNpcs((current) => current.filter((item) => item.id !== npcId));
      setLinks((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${npcId}:`))
      ));
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteRelationshipNpc(npc.persistedId, npc.avatarPath, sessionId);
      await load();
      setStatus('NPC deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete NPC.');
    } finally {
      setIsDeleting(false);
    }
  }, [load, sessionId]);

  const hasChanges = useMemo(() => {
    if (npcs.length !== baselineNpcs.length) return true;
    if (npcs.some((npc, index) => {
      const baseline = baselineNpcs[index];
      return !baseline || npc.id !== baseline.id || npc.name !== baseline.name ||
        npc.description !== baseline.description || Boolean(npc.avatarFile);
    })) return true;

    return JSON.stringify(links) !== JSON.stringify(baselineLinks);
  }, [baselineLinks, baselineNpcs, links, npcs]);

  return {
    npcs,
    links,
    audience,
    selectedCharacterId,
    isLoading,
    isSaving,
    isDeleting,
    isEditing,
    hasChanges,
    error,
    status,
    setSelectedCharacterId,
    beginEditing,
    cancelEditing,
    addNpc,
    updateNpc,
    selectNpcImage,
    updateSelectedLink,
    getSelectedLink,
    moveNpc,
    save,
    removeNpc,
  };
}
