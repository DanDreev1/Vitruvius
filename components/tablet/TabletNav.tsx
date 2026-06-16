'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

import { getVisibleTabletTabs } from '@/features/tablet/navigation';
import type { TabletRole, TabletTab } from '@/features/tablet/types';
import type { TabletViewMode } from '@/lib/game/types';

type TabletNavProps = {
  activeTab: TabletTab;
  onTabChange: (tab: TabletTab) => void;
  targetRole: TabletRole;
  mode: TabletViewMode;
  onClose: () => void;
  activeFrameSide?: 'left' | 'right';
};

export default function TabletNav({
  activeTab,
  onTabChange,
  targetRole,
  mode,
  onClose,
  activeFrameSide = 'left',
}: TabletNavProps) {
  const tabs = getVisibleTabletTabs(targetRole, mode);
  const activeFrameSrc =
    activeFrameSide === 'right'
      ? '/tablet/master/scene/tabs/tab-active-frame-right.svg'
      : '/tablet/master/scene/tabs/tab-active-frame-left.svg';

  return (
    <div className="flex h-full flex-col items-center py-[28px]">
      <button
        type="button"
        onClick={onClose}
        className="relative flex h-[44px] w-[64px] items-center justify-center rounded-[14px] transition-opacity duration-200 hover:opacity-75"
        title="Close tablet"
      >
        <Image src="/Logo_Icon.png" alt="" width={48} height={28} />
      </button>

      <div className="mt-[30px] flex flex-1 flex-col items-center justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className="group relative flex h-[54px] w-[64px] items-center justify-center"
              title={tab.label}
            >
              {isActive ? (
                <motion.span
                  layoutId={`tablet-active-frame-${targetRole}-${activeFrameSide}`}
                  className="pointer-events-none absolute h-[58px] w-[58px]"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 30,
                  }}
                >
                  <Image
                    src={activeFrameSrc}
                    alt=""
                    fill
                    sizes="58px"
                    className="object-contain"
                  />
                </motion.span>
              ) : (
                <span className="pointer-events-none absolute h-[58px] w-[58px] opacity-0 transition-opacity duration-200 group-hover:opacity-45">
                  <Image
                    src={activeFrameSrc}
                    alt=""
                    fill
                    sizes="58px"
                    className="object-contain"
                  />
                </span>
              )}

              {tab.iconSrc ? (
                <Image
                  src={tab.iconSrc}
                  alt=""
                  width={34}
                  height={34}
                  className="relative z-10"
                />
              ) : (
                <span className="relative z-10 font-montserrat-alt text-[24px] font-extrabold text-white">
                  {tab.short}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
