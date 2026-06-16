'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SceneImageItem, SceneImageRecord } from './types';
import {
  createInGameWorldSceneImage,
  deleteInGameWorldSceneImage,
  getInGameWorldSceneImages,
  updateInGameWorldSceneImageActive,
} from './api';

function mapRecordToItem(record: SceneImageRecord): SceneImageItem {
  return {
    id: record.id,
    title: record.title,
    imageUrl: record.image_url,
    isActive: record.is_active,
    sortOrder: record.sort_order,
  };
}

export function useSceneImages(inGameWorldId: string | null) {
  const [records, setRecords] = useState<SceneImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    if (!inGameWorldId) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextRecords = await getInGameWorldSceneImages(inGameWorldId);
      setRecords(nextRecords);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load scene images.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [inGameWorldId]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!inGameWorldId) {
        throw new Error('In-game world id is missing.');
      }

      setIsUploading(true);
      setError(null);

      try {
        await createInGameWorldSceneImage(inGameWorldId, file);
        await loadImages();
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Failed to upload scene image.';
        setError(message);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [inGameWorldId]
  );

  const deleteImage = useCallback(async (imageId: string) => {
    setError(null);

    try {
      await deleteInGameWorldSceneImage(imageId);
      setRecords((currentRecords) =>
        currentRecords.filter((record) => record.id !== imageId)
      );
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Failed to delete scene image.';
      setError(message);
      throw deleteError;
    }
  }, []);

  const toggleImageActive = useCallback(async (imageId: string, nextIsActive: boolean) => {
  setError(null);

  try {
    await updateInGameWorldSceneImageActive(imageId, nextIsActive);
    await loadImages();
  } catch (toggleError) {
    const message =
      toggleError instanceof Error
        ? toggleError.message
        : 'Failed to update scene image visibility.';
    setError(message);
    throw toggleError;
  }
}, [loadImages]);

  const images = useMemo(
    () => records.map(mapRecordToItem),
    [records]
  );

  return {
    images,
    isLoading,
    isUploading,
    error,
    loadImages,
    uploadImage,
    deleteImage,
    toggleImageActive,
  };
}