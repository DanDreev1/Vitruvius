type SystemLabelGroup = 'attributes' | 'parameters';

const systemLabelKeys = {
  attributes: new Set(['constitution', 'awareness', 'agility', 'thinking', 'charisma', 'will']),
  parameters: new Set(['health', 'inspiration', 'stress']),
} satisfies Record<SystemLabelGroup, Set<string>>;

export function getSystemLabelKey(group: SystemLabelGroup, key: string | null | undefined) {
  const normalizedKey = key?.trim().toLowerCase();
  if (!normalizedKey || !systemLabelKeys[group].has(normalizedKey)) return null;

  return `${group}.${normalizedKey}` as const;
}

export function translateSystemLabel(
  group: SystemLabelGroup,
  key: string | null | undefined,
  fallbackLabel: string,
  translate: (key: never) => string
) {
  const labelKey = getSystemLabelKey(group, key);
  return labelKey ? translate(labelKey as never) : fallbackLabel;
}
