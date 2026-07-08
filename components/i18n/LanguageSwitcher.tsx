'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { isLocale, locales, type Locale } from '@/i18n/config';

const labels: Record<Locale, 'english' | 'russian' | 'ukrainian'> = {
  en: 'english',
  ru: 'russian',
  uk: 'ukrainian',
};

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const currentLocale = useLocale();
  const router = useRouter();
  const t = useTranslations('Language');
  const [isSaving, setIsSaving] = useState(false);

  async function changeLanguage(locale: Locale) {
    if (locale === currentLocale || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      if (!response.ok) throw new Error('Could not change language.');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const selectedLocale = isLocale(currentLocale) ? currentLocale : 'en';

  return (
    <div className={compact ? '' : 'rounded-[20px] border border-white/10 bg-[#243047] px-[20px] py-[18px]'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-montserrat-alt text-[20px] font-extrabold text-white">{t('title')}</p>
          {!compact ? <p className="mt-1 font-montserrat text-[12px] leading-relaxed text-white/55">{t('description')}</p> : null}
        </div>
        {isSaving ? <span className="font-montserrat text-[10px] font-bold text-[#D6B25E]">{t('saving')}</span> : null}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            disabled={isSaving}
            onClick={() => void changeLanguage(locale)}
            className={`h-[42px] rounded-[13px] border font-montserrat text-[11px] font-extrabold transition disabled:opacity-50 ${selectedLocale === locale ? 'border-white bg-white text-[#172033]' : 'border-white/15 bg-transparent text-white hover:bg-white/[.06]'}`}
          >
            {t(labels[locale])}
          </button>
        ))}
      </div>
    </div>
  );
}
