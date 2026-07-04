export const locales = ['en', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';
export const localeCookieName = 'vitruvius_locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const language = value.trim().toLowerCase().split('-')[0];
  return isLocale(language) ? language : null;
}

export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const preferences = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(';');
      const qualityValue = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qualityValue ? Number(qualityValue.trim().slice(2)) : 1;
      return { locale: normalizeLocale(tag), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((preference): preference is { locale: Locale; quality: number; index: number } => Boolean(preference.locale) && preference.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  return preferences[0]?.locale ?? defaultLocale;
}
