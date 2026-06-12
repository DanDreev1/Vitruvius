'use client';

import {
  MASTER_TABLET_TABS,
  PLAYER_TABLET_TABS,
} from '@/features/tablet/navigation';
import type { TabletRole, TabletTab } from '@/features/tablet/types';

type TabletNavProps = {
  activeTab: TabletTab;
  onTabChange: (tab: TabletTab) => void;
  targetRole: TabletRole;
};

export default function TabletNav({
  activeTab,
  onTabChange,
  targetRole,
}: TabletNavProps) {
  const tabs = targetRole === 'master' ? MASTER_TABLET_TABS : PLAYER_TABLET_TABS;

  return (
    <div className="flex h-full flex-col items-center justify-between py-[18px]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={[
              'group relative flex h-[70px] w-[70px] items-center justify-center rounded-[22px] border transition-all duration-200',
              isActive
                ? 'border-[#D6B25E] bg-[#273041]'
                : 'border-white/8 bg-[#1A2332] hover:bg-[#202A3C]',
            ].join(' ')}
            title={tab.label}
          >
            <span
              className={[
                'font-montserrat-alt text-[24px] font-extrabold',
                isActive ? 'text-[#D6B25E]' : 'text-white/80',
              ].join(' ')}
            >
              {tab.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}