import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const locales = ['en', 'ru', 'uk'];

function flatten(value, prefix = '', result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, result);
    else result.set(path, child);
  }
  return result;
}

function variables(message) {
  if (typeof message !== 'string') return [];
  return [...message.matchAll(/\{\s*([a-zA-Z][\w]*)/g)].map((match) => match[1]).sort();
}

const dictionaries = Object.fromEntries(await Promise.all(locales.map(async (locale) => {
  const source = await readFile(resolve(`messages/${locale}.json`), 'utf8');
  const studio = await readFile(resolve(`messages/${locale}.studio.json`), 'utf8');
  const lobby = await readFile(resolve(`messages/${locale}.lobby.json`), 'utf8');
  const studioShell = await readFile(resolve(`messages/${locale}.studio-shell.json`), 'utf8');
  const studioEditor = await readFile(resolve(`messages/${locale}.studio-editor.json`), 'utf8');
  const studioMaster = await readFile(resolve(`messages/${locale}.studio-master.json`), 'utf8');
  const game = await readFile(resolve(`messages/${locale}.game.json`), 'utf8');
  return [locale, flatten({...JSON.parse(source), ...JSON.parse(studio), ...JSON.parse(studioShell), ...JSON.parse(studioEditor), ...JSON.parse(studioMaster), ...JSON.parse(lobby), ...JSON.parse(game)})];
})));

const reference = dictionaries.en;
const failures = [];

for (const locale of locales.filter((value) => value !== 'en')) {
  const dictionary = dictionaries[locale];
  for (const [key, englishValue] of reference) {
    if (!dictionary.has(key)) {
      failures.push(`${locale}: missing ${key}`);
      continue;
    }
    const translatedValue = dictionary.get(key);
    if (typeof translatedValue !== typeof englishValue) failures.push(`${locale}: invalid value type for ${key}`);
    if (variables(translatedValue).join(',') !== variables(englishValue).join(',')) failures.push(`${locale}: ICU variables differ for ${key}`);
  }
  for (const key of dictionary.keys()) {
    if (!reference.has(key)) failures.push(`${locale}: unknown key ${key}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Translations are complete: ${reference.size} keys across ${locales.length} locales.`);
