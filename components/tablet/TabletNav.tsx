'use client';

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
};

export default function TabletNav({
  activeTab,
  onTabChange,
  targetRole,
  mode,
  onClose,
}: TabletNavProps) {
  const tabs = getVisibleTabletTabs(targetRole, mode);

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
              className="group relative flex h-[48px] w-[58px] items-center justify-center"
              title={tab.label}
            >
              <span
                className={[
                  'pointer-events-none absolute inset-[3px] border-2 border-white transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-45',
                  tab.key === 'skills' ||
                  tab.key === 'relationship' ||
                  tab.key === 'notes' ||
                  tab.key === 'settings'
                    ? '-rotate-8'
                    : 'rotate-6',
                ].join(' ')}
              />

              {tab.iconSrc ? (
                <Image src={tab.iconSrc} alt="" width={34} height={34} />
              ) : (
                <span className="font-montserrat-alt text-[24px] font-extrabold text-white">
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
