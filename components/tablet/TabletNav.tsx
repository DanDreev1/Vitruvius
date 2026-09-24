'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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

function getPlayerTabTitle(
  tab: TabletTab,
  t: ReturnType<typeof useTranslations<'TabletPlayer.navigation'>>
) {
  switch (tab) {
    case 'user':
      return t('user');
    case 'skills':
      return t('skills');
    case 'backpack':
      return t('backpack');
    case 'library':
      return t('library');
    case 'relationship':
      return t('relationship');
    case 'notes':
      return t('notes');
    case 'settings':
      return t('settings');
    default:
      return tab;
  }
}

function getMasterTabTitle(
  tab: TabletTab,
  t: ReturnType<typeof useTranslations<'TabletMaster.navigation'>>
) {
  switch (tab) {
    case 'scene':
      return t('scene');
    case 'party':
      return t('party');
    case 'relationship':
      return t('relationship');
    case 'assets':
      return t('assets');
    case 'notes':
      return t('notes');
    case 'settings':
      return t('settings');
    default:
      return tab;
  }
}

export default function TabletNav({
  activeTab,
  onTabChange,
  targetRole,
  mode,
  onClose,
  activeFrameSide = 'left',
}: TabletNavProps) {
  const playerT = useTranslations('TabletPlayer.navigation');
  const masterT = useTranslations('TabletMaster.navigation');
  const commonT = useTranslations('TabletPlayer.common');
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
        className="relative flex h-[54px] w-[72px] items-center justify-center rounded-[14px] transition-opacity duration-200 hover:opacity-75"
        title={commonT('closeTablet')}
      >
        <Image src="/Logo_Icon.png" alt="" width={48} height={28} />
      </button>

      <div className="mt-[48px] flex flex-col items-center gap-[20px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className="group relative flex h-[64px] w-[72px] items-center justify-center"
              title={targetRole === 'player' ? getPlayerTabTitle(tab.key, playerT) : getMasterTabTitle(tab.key, masterT)}
            >
              {isActive ? (
                <motion.span
                  layoutId={`tablet-active-frame-${targetRole}-${activeFrameSide}`}
                  className="pointer-events-none absolute h-[66px] w-[66px]"
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
                    sizes="66px"
                    className="object-contain"
                  />
                </motion.span>
              ) : (
                <span className="pointer-events-none absolute h-[66px] w-[66px] opacity-0 transition-opacity duration-200 group-hover:opacity-45">
                  <Image
                    src={activeFrameSrc}
                    alt=""
                    fill
                    sizes="66px"
                    className="object-contain"
                  />
                </span>
              )}

              {tab.iconSrc ? (
                <Image
                  src={tab.iconSrc}
                  alt=""
                  width={38}
                  height={38}
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
