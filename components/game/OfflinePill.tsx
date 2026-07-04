"use client";

import { useTranslations } from 'next-intl';

type OfflinePillProps = {
  fontSize: number;
};

export default function OfflinePill({ fontSize }: OfflinePillProps) {
  const t = useTranslations('Game');
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2 pt-2">
      <span
        className="font-montserrat rounded-full border border-[#5A1A1A] bg-[#2A0C0C] px-2.5 py-1 font-semibold text-[#FF9B9B] shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
      >
        {t('offline')}
      </span>
    </div>
  );
}
