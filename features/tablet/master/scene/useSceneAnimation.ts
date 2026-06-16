'use client';

import { useEffect, useRef, useState } from 'react';

import { SCENE_TAB_ORDER } from './constants';
import type { SceneDirection, SceneTab } from './types';

export function useSceneAnimation(activeTab: SceneTab) {
  const previousTabRef = useRef<SceneTab>(activeTab);
  const [direction, setDirection] = useState<SceneDirection>(1);

  useEffect(() => {
    const previousTab = previousTabRef.current;

    if (previousTab === activeTab) {
      return;
    }

    const previousIndex = SCENE_TAB_ORDER.indexOf(previousTab);
    const nextIndex = SCENE_TAB_ORDER.indexOf(activeTab);

    setDirection(nextIndex > previousIndex ? 1 : -1);
    previousTabRef.current = activeTab;
  }, [activeTab]);

  return {
    direction,
  };
}