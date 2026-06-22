export type TabletPlayerAttribute = {
  id: string;
  key: string;
  label: string;
  iconKey: string;
  value: number;
  sortOrder: number;
};

export type TabletPlayerParameter = {
  id: string;
  key: string;
  label: string;
  iconKey: string;
  currentValue: number;
  maxValue: number | null;
  sortOrder: number;
};

export type TabletPlayerDomainSkill = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  isPrimary: boolean;
  level: number;
  sortOrder: number;
  metadata: Record<string, unknown>;
  isDraft?: boolean;
};

export type TabletPlayerDomain = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  level: number;
  sortOrder: number;
  skills: TabletPlayerDomainSkill[];
  metadata: Record<string, unknown>;
  isDraft?: boolean;
};

export type TabletPlayerExperience = {
  id: string;
  headline: string;
  description: string | null;
  xp: number;
  tag: string | null;
  sessionLabel: string | null;
  happenedAt: string | null;
  sortOrder: number;
  metadata: Record<string, unknown>;
  isDraft?: boolean;
};

export type TabletPlayerCharacter = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  attributes: TabletPlayerAttribute[];
  parameters: TabletPlayerParameter[];
  domains: TabletPlayerDomain[];
  experiences: TabletPlayerExperience[];
};

export type TabletPlayerCharacterDraft = {
  name: string;
  description: string;
  avatarUrl: string | null;
  portraitFile: File | null;
  portraitPreviewUrl: string | null;
  attributes: TabletPlayerAttribute[];
  parameters: TabletPlayerParameter[];
  domains: TabletPlayerDomain[];
};

export type TabletPlayerCharacterSavePatch = {
  id: string;
  character?: {
    name?: string;
    description?: string | null;
    avatarUrl?: string | null;
  };
  attributes?: Array<{
    id: string;
    value: number;
  }>;
  parameters?: Array<{
    id: string;
    currentValue: number;
  }>;
  domains?: TabletPlayerDomain[];
};
