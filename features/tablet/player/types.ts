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

export type TabletPlayerCharacter = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  attributes: TabletPlayerAttribute[];
  parameters: TabletPlayerParameter[];
};

export type TabletPlayerCharacterDraft = {
  name: string;
  description: string;
  avatarUrl: string | null;
  portraitFile: File | null;
  portraitPreviewUrl: string | null;
  attributes: TabletPlayerAttribute[];
  parameters: TabletPlayerParameter[];
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
};
