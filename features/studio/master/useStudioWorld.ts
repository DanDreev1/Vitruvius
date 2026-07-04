'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadStudioWorld } from './api';
import type { StudioWorldData } from './types';

export function useStudioWorld(worldId: string, enabled = true) {
  const [data, setData] = useState<StudioWorldData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) { setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try { setData(await loadStudioWorld(worldId)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load world.'); }
    finally { setIsLoading(false); }
  }, [enabled, worldId]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);
  return { data, setData, isLoading, error, setError, reload };
}
