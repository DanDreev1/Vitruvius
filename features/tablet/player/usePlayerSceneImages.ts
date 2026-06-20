'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SCENE_IMAGES_CHANGED_EVENT,
  getAvailablePlayerSceneImages,
  getSceneImagesRealtimeChannelName,
} from '@/features/tablet/master/scene/api';
import type {
  SceneImageItem,
  SceneImageRecord,
} from '@/features/tablet/master/scene/types';
import { supabase } from '@/lib/supabaseClient';

function mapRecordToItem(record: SceneImageRecord): SceneImageItem {
  return {
    id: record.id,
    title: record.title,
    imageUrl: record.image_url,
    isActive: record.is_active,
    sortOrder: record.sort_order,
  };
}

export function usePlayerSceneImages({
  sessionId,
  inGameWorldId,
  participantId,
  enabled = true,
}: {
  sessionId: string | null;
  inGameWorldId: string | null;
  participantId: string | null;
  enabled?: boolean;
}) {
  const [records, setRecords] = useState<SceneImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled || !sessionId || !inGameWorldId || !participantId) {
      setRecords([]);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const nextRecords = await getAvailablePlayerSceneImages({
        sessionId,
        inGameWorldId,
        participantId,
      });
      setRecords(nextRecords);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load available scene images.';
      setError(message);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [enabled, inGameWorldId, participantId, sessionId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadImages();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadImages]);

  useEffect(() => {
    if (!enabled || !sessionId || !inGameWorldId || !participantId) {
      return;
    }

    const channel = supabase
      .channel(getSceneImagesRealtimeChannelName(sessionId))
      .on(
        'broadcast',
        {
          event: SCENE_IMAGES_CHANGED_EVENT,
        },
        () => {
          void loadImages({ silent: true });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_game_worlds_scene_images',
          filter: `in_game_world_id=eq.${inGameWorldId}`,
        },
        () => {
          void loadImages({ silent: true });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_game_worlds_scene_image_targets',
        },
        () => {
          void loadImages({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, inGameWorldId, loadImages, participantId, sessionId]);

  return {
    images: useMemo(() => records.map(mapRecordToItem), [records]),
    isLoading,
    error,
    reload: loadImages,
  };
}
