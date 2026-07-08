'use client';

import { useState } from 'react';

import { SCENE_DEFAULT_TAB } from './constants';
import type { SceneTab } from './types';

export function useSceneTabs(initialTab: SceneTab = SCENE_DEFAULT_TAB) {
  const [activeTab, setActiveTab] = useState<SceneTab>(initialTab);

  const changeTab = (nextTab: SceneTab) => {
    setActiveTab((currentTab) => {
      if (currentTab === nextTab) {
        return currentTab;
      }

      return nextTab;
    });
  };

  return {
    activeTab,
    changeTab,
  };
}