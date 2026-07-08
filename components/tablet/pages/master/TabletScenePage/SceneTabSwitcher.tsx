'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { SCENE_TAB_ICON_PATHS } from '@/features/tablet/master/scene/constants';
import type { SceneTab } from '@/features/tablet/master/scene/types';

type SceneTabSwitcherProps = {
  activeTab: SceneTab;
  onTabChange: (tab: SceneTab) => void;
};

const tabs: SceneTab[] = ['images', 'music'];

export default function SceneTabSwitcher({
  activeTab,
  onTabChange,
}: SceneTabSwitcherProps) {
  const t = useTranslations('TabletMaster.scene.tabs');
  return (
    <div className="flex items-center justify-around">
      <div className="flex h-[72px] items-center gap-[30px] rounded-full bg-[#5C5C5C] px-[45px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const label = t(tab);

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              aria-label={label}
              aria-pressed={isActive}
              className="relative flex h-[60px] w-[60px] items-center justify-center"
            >
              {isActive ? (
                <motion.div
                  layoutId="scene-active-tab"
                  className="absolute inset-0 flex items-center justify-center"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 30,
                  }}
                >
                  <img
                    src="/tablet/master/scene/tabs/tab-active-frame-right.svg"
                    alt=""
                    className="h-[60px] w-[60px] object-contain"
                  />
                </motion.div>
              ) : null}

              <img
                src={SCENE_TAB_ICON_PATHS[tab]}
                alt={label}
                className="relative z-10 h-[35px] w-[35px] object-contain"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
