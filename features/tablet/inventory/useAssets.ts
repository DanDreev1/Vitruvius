'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ASSET_DESCRIPTION_MAX_LENGTH,
  ASSET_NAME_MAX_LENGTH,
  ASSET_SORT_SAVE_DELAY_MS,
} from './constants';
import {
  deleteAsset,
  getAssets,
  getInventoryAudience,
  grantAsset,
  saveAssetOrder,
  saveAssets,
} from './api';
import type { AssetDraft, InventoryAudienceMember } from './types';
import { createId } from '@/lib/createId';

function toDrafts(items: Awaited<ReturnType<typeof getAssets>>): AssetDraft[] {
  return items.map((item) => ({
    ...item,
    persistedId: item.id,
    imageFile: null,
    imagePreviewUrl: null,
    isNew: false,
  }));
}

export function useAssets(sessionId: string, inGameWorldId: string | null) {
  const [assets, setAssets] = useState<AssetDraft[]>([]);
  const [baseline, setBaseline] = useState<AssetDraft[]>([]);
  const [audience, setAudience] = useState<InventoryAudienceMember[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assetsRef = useRef(assets);
  const sortTimerRef = useRef<number | null>(null);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  const load = useCallback(async () => {
    if (!inGameWorldId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [items, players] = await Promise.all([
        getAssets(inGameWorldId),
        getInventoryAudience(sessionId),
      ]);
      const drafts = toDrafts(items);
      setAssets(drafts);
      setBaseline(drafts.map((item) => ({ ...item })));
      setAudience(players);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load assets.');
    } finally { setIsLoading(false); }
  }, [inGameWorldId, sessionId]);

  useEffect(() => { const id = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(id); }, [load]);

  const add = useCallback(() => {
    const id = `draft-${createId()}`;
    setAssets((current) => [...current, {
      id,
      persistedId: null,
      assetKey: createId(),
      name: '', description: '', category: 'other', imagePath: '', imageUrl: null,
      imageFile: null, imagePreviewUrl: null, sortOrder: current.length, isNew: true,
    }]);
    setIsEditing(true);
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<AssetDraft>) => {
    setAssets((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const selectImage = useCallback((id: string, file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Item image must be JPEG, PNG, or WebP and no larger than 5 MB.'); return;
    }
    setAssets((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);
      return { ...item, imageFile: file, imagePreviewUrl: URL.createObjectURL(file) };
    }));
  }, []);

  const save = useCallback(async () => {
    if (!inGameWorldId) return;
    const invalid = assets.find((item) => !item.name.trim() || !item.description.trim() || (!item.imagePath && !item.imageFile));
    if (invalid) { setError('Every item needs a name, description, and image.'); return; }
    if (assets.some((item) => item.name.length > ASSET_NAME_MAX_LENGTH || item.description.length > ASSET_DESCRIPTION_MAX_LENGTH)) {
      setError('An item exceeds the name or description limit.'); return;
    }
    setIsSaving(true); setError(null);
    try { await saveAssets(inGameWorldId, sessionId, assets); await load(); setIsEditing(false); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Failed to save assets.'); }
    finally { setIsSaving(false); }
  }, [assets, inGameWorldId, load, sessionId]);

  const cancel = useCallback(() => {
    assetsRef.current.forEach((item) => item.imagePreviewUrl && URL.revokeObjectURL(item.imagePreviewUrl));
    setAssets(baseline.map((item) => ({ ...item })));
    setIsEditing(false); setError(null);
  }, [baseline]);

  const remove = useCallback(async (item: AssetDraft) => {
    if (!item.persistedId) { setAssets((current) => current.filter((asset) => asset.id !== item.id)); return; }
    try { await deleteAsset(item); await load(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete asset.'); }
  }, [load]);

  const move = useCallback((fromId: string, toId: string) => {
    setAssets((current) => {
      const from = current.findIndex((item) => item.id === fromId);
      const to = current.findIndex((item) => item.id === toId);
      if (from < 0 || to < 0) return current;
      const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item);
      if (sortTimerRef.current) window.clearTimeout(sortTimerRef.current);
      sortTimerRef.current = window.setTimeout(() => void saveAssetOrder(sessionId, next), ASSET_SORT_SAVE_DELAY_MS);
      return next.map((asset, index) => ({ ...asset, sortOrder: index }));
    });
  }, [sessionId]);

  const give = useCallback(async (assetId: string, ids: string[], quantity: number) => {
    try { await grantAsset(assetId, ids, quantity, sessionId); }
    catch (giveError) { setError(giveError instanceof Error ? giveError.message : 'Failed to give item.'); throw giveError; }
  }, [sessionId]);

  const hasChanges = useMemo(() => JSON.stringify(assets.map(({ imageFile, imagePreviewUrl, ...item }) => ({ ...item, hasFile: Boolean(imageFile), imagePreviewUrl: Boolean(imagePreviewUrl) }))) !== JSON.stringify(baseline.map(({ imageFile, imagePreviewUrl, ...item }) => ({ ...item, hasFile: Boolean(imageFile), imagePreviewUrl: Boolean(imagePreviewUrl) }))), [assets, baseline]);

  return { assets, audience, isEditing, isLoading, isSaving, error, hasChanges, setIsEditing, add, update, selectImage, save, cancel, remove, move, give };
}
