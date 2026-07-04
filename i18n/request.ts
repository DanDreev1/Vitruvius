import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, detectLocale, isLocale, localeCookieName } from './config';

const dictionaries = {
  en: async () => ({...(await import('../messages/en.json')).default, ...(await import('../messages/en.studio.json')).default, ...(await import('../messages/en.studio-shell.json')).default, ...(await import('../messages/en.studio-editor.json')).default, ...(await import('../messages/en.studio-master.json')).default, ...(await import('../messages/en.lobby.json')).default, ...(await import('../messages/en.game.json')).default}),
  ru: async () => ({...(await import('../messages/ru.json')).default, ...(await import('../messages/ru.studio.json')).default, ...(await import('../messages/ru.studio-shell.json')).default, ...(await import('../messages/ru.studio-editor.json')).default, ...(await import('../messages/ru.studio-master.json')).default, ...(await import('../messages/ru.lobby.json')).default, ...(await import('../messages/ru.game.json')).default}),
  uk: async () => ({...(await import('../messages/uk.json')).default, ...(await import('../messages/uk.studio.json')).default, ...(await import('../messages/uk.studio-shell.json')).default, ...(await import('../messages/uk.studio-editor.json')).default, ...(await import('../messages/uk.studio-master.json')).default, ...(await import('../messages/uk.lobby.json')).default, ...(await import('../messages/uk.game.json')).default}),
} as const;

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : detectLocale((await headers()).get('accept-language'));

  return {
    locale: locale ?? defaultLocale,
    messages: await dictionaries[locale ?? defaultLocale](),
  };
});
