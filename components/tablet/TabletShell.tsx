"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { canEditTablet } from "@/features/tablet/navigation";
import {
  PLAYER_TABLET_ATTRIBUTE_MAX_VALUE,
  PLAYER_TABLET_ATTRIBUTE_MIN_VALUE,
  PLAYER_TABLET_CHARACTER_NAME_MAX_LENGTH,
  PLAYER_TABLET_CUSTOM_ICON_MAX_FILE_SIZE_BYTES,
  PLAYER_TABLET_DOMAIN_MAX_LEVEL,
  PLAYER_TABLET_DOMAIN_MIN_LEVEL,
  PLAYER_TABLET_HEALTH_ATTRIBUTE_KEY,
  PLAYER_TABLET_HEALTH_MULTIPLIER,
  PLAYER_TABLET_INSPIRATION_MAX_VALUE,
  PLAYER_TABLET_MAX_DOMAINS,
  PLAYER_TABLET_PARAMETER_MIN_VALUE,
  PLAYER_TABLET_PORTRAIT_ALLOWED_MIME_TYPES,
  PLAYER_TABLET_PORTRAIT_COOLDOWN_NOTICE_MS,
  PLAYER_TABLET_PORTRAIT_MAX_FILE_SIZE_BYTES,
  PLAYER_TABLET_PORTRAIT_UPDATE_COOLDOWN_MS,
  PLAYER_TABLET_STRESS_MAX_VALUE,
} from "@/features/tablet/player/constants";
import {
  saveTabletPlayerCharacterPatch,
  uploadTabletPlayerCustomIcon,
  uploadTabletPlayerPortrait,
} from "@/features/tablet/player/api";
import type {
  TabletParticipant,
  TabletRole,
  TabletTab,
} from "@/features/tablet/types";
import type {
  TabletPlayerAttribute,
  TabletPlayerCharacter,
  TabletPlayerCharacterDraft,
  TabletPlayerDomain,
  TabletPlayerDomainSkill,
  TabletPlayerExperience,
  TabletPlayerParameter,
  TabletPlayerCharacterSavePatch,
} from "@/features/tablet/player/types";
import type { TabletViewMode } from "@/lib/game/types";

import TabletNav from "./TabletNav";
import TabletPageRenderer from "./TabletPageRenderer";

type TabletShellProps = {
  activeTab: TabletTab;
  onTabChange: (tab: TabletTab) => void;
  viewerUserId: string;
  targetUserId: string;
  mode: TabletViewMode;
  targetRole: TabletRole;
  onClose: () => void;
  sessionId: string;
  inGameWorldId: string | null;
  participants: TabletParticipant[];
  playerCharacter: TabletPlayerCharacter | null;
  isPlayerCharacterLoading: boolean;
  playerCharacterError: string | null;
  onPlayerCharacterSaved: (character: TabletPlayerCharacter | null) => void;
};

type SharedShellLayoutProps = TabletShellProps;

const attributeIconSrcByKey: Record<string, string> = {
  constitution: "/attributes-imgs/Cons.png",
  "heart-pulse": "/attributes-imgs/Cons.png",
  awareness: "/attributes-imgs/Awareness.png",
  "user-alert": "/attributes-imgs/Awareness.png",
  agility: "/attributes-imgs/Agility.png",
  running: "/attributes-imgs/Agility.png",
  thinking: "/attributes-imgs/Thinking.png",
  brain: "/attributes-imgs/Thinking.png",
  charisma: "/attributes-imgs/Charisma.png",
  mask: "/attributes-imgs/Charisma.png",
  will: "/attributes-imgs/Will.png",
  fist: "/attributes-imgs/Will.png",
};

const parameterIconSrcByKey: Record<string, string> = {
  health: "/parameters/Health.png",
  heart: "/parameters/Health.png",
  inspiration: "/parameters/Inspirations.png",
  star: "/parameters/Inspirations.png",
  stress: "/parameters/Stress.png",
};

const defaultPlayerAttributes = [
  { key: "constitution", label: "Constitution", value: 1 },
  { key: "awareness", label: "Awareness", value: 1 },
  { key: "agility", label: "Agility", value: 1 },
  { key: "thinking", label: "Thinking", value: 1 },
  { key: "charisma", label: "Charisma", value: 1 },
  { key: "will", label: "Will", value: 1 },
];

const defaultPlayerParameters = [
  { key: "health", label: "Health", value: 5 },
  { key: "inspiration", label: "Inspiration", value: 6 },
  { key: "stress", label: "Stress", value: 0 },
];

const editablePlayerTabs: TabletTab[] = ["user", "skills"];

const defaultDomainIcons = [
  "skills",
  "book",
  "flask",
  "backpack",
  "thinking",
] as const;

function createDraftId(prefix: string) {
  return `draft-${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function cloneAttribute(attribute: TabletPlayerAttribute): TabletPlayerAttribute {
  return { ...attribute };
}

function cloneParameter(parameter: TabletPlayerParameter): TabletPlayerParameter {
  return { ...parameter };
}

function cloneDomainSkill(
  skill: TabletPlayerDomainSkill
): TabletPlayerDomainSkill {
  return {
    ...skill,
    metadata: { ...skill.metadata },
  };
}

function cloneDomain(domain: TabletPlayerDomain): TabletPlayerDomain {
  return {
    ...domain,
    metadata: { ...domain.metadata },
    skills: domain.skills.map(cloneDomainSkill),
  };
}

function createDefaultDomain(sortOrder = 0): TabletPlayerDomain {
  const domainId = createDraftId("domain");
  const domainKey = `domain-${sortOrder + 1}`;

  return {
    id: domainId,
    key: domainKey,
    name: "Name of the Domain",
    description: null,
    iconKey: defaultDomainIcons[sortOrder % defaultDomainIcons.length],
    level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
    sortOrder,
    metadata: {},
    isDraft: true,
    skills: [
      {
        id: createDraftId("skill-primary"),
        key: `${domainKey}-primary`,
        name: "Skill name",
        description: "Skill description.",
        iconKey: "book",
        isPrimary: true,
        level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
        sortOrder: 0,
        metadata: { icon_key: "book" },
        isDraft: true,
      },
      {
        id: createDraftId("skill"),
        key: `${domainKey}-skill-1`,
        name: "Skill name",
        description: "Skill description.",
        iconKey: "book",
        isPrimary: false,
        level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
        sortOrder: 1,
        metadata: { icon_key: "book" },
        isDraft: true,
      },
    ],
  };
}

function createDefaultSkill(
  domain: TabletPlayerDomain,
  sortOrder: number
): TabletPlayerDomainSkill {
  return {
    id: createDraftId("skill"),
    key: `${domain.key}-skill-${sortOrder}`,
    name: "Skill name",
    description: "Skill description.",
    iconKey: "book",
    isPrimary: false,
    level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
    sortOrder,
    metadata: { icon_key: "book" },
    isDraft: true,
  };
}

function ensurePlayerDomains(domains: TabletPlayerDomain[]) {
  if (domains.length) {
    return domains.slice(0, PLAYER_TABLET_MAX_DOMAINS).map(cloneDomain);
  }

  return [createDefaultDomain()];
}

function createDraftFromCharacter(
  character: TabletPlayerCharacter | null
): TabletPlayerCharacterDraft {
  return {
    name: character?.name ?? "Name",
    description: character?.description ?? "",
    avatarUrl: character?.avatarUrl ?? null,
    portraitFile: null,
    portraitPreviewUrl: null,
    attributes: character?.attributes.map(cloneAttribute) ?? [],
    parameters: character?.parameters.map(cloneParameter) ?? [],
    domains: ensurePlayerDomains(character?.domains ?? []),
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isParameterKey(parameter: TabletPlayerParameter, key: string) {
  return parameter.key === key || parameter.iconKey === key;
}

function getAttributeValue(
  attributes: TabletPlayerAttribute[],
  key: string,
  fallbackValue: number
) {
  return (
    attributes.find(
      (attribute) => attribute.key === key || attribute.iconKey === key
    )?.value ?? fallbackValue
  );
}

function getParameterValue(
  parameters: TabletPlayerParameter[],
  key: string,
  fallbackValue: number
) {
  return (
    parameters.find((parameter) => isParameterKey(parameter, key))
      ?.currentValue ?? fallbackValue
  );
}

function getHealthMaxValue(attributes: TabletPlayerAttribute[]) {
  const constitution = getAttributeValue(
    attributes,
    PLAYER_TABLET_HEALTH_ATTRIBUTE_KEY,
    1
  );

  return Math.max(0, constitution * PLAYER_TABLET_HEALTH_MULTIPLIER);
}

function getInspirationMaxValue(parameters: TabletPlayerParameter[]) {
  const stress = getParameterValue(parameters, "stress", 0);

  return Math.max(0, PLAYER_TABLET_INSPIRATION_MAX_VALUE - stress);
}

function getParameterMaxValue(
  parameter: TabletPlayerParameter,
  attributes: TabletPlayerAttribute[],
  parameters: TabletPlayerParameter[]
) {
  if (isParameterKey(parameter, "health")) {
    return getHealthMaxValue(attributes);
  }

  if (isParameterKey(parameter, "inspiration")) {
    return getInspirationMaxValue(parameters);
  }

  if (isParameterKey(parameter, "stress")) {
    return PLAYER_TABLET_STRESS_MAX_VALUE;
  }

  return null;
}

function normalizeParameterValues(
  attributes: TabletPlayerAttribute[],
  parameters: TabletPlayerParameter[]
) {
  return parameters.map((parameter) => {
    const maxValue = getParameterMaxValue(parameter, attributes, parameters);
    const minValue = PLAYER_TABLET_PARAMETER_MIN_VALUE;

    if (maxValue === null) {
      return {
        ...parameter,
        currentValue: Math.max(minValue, parameter.currentValue),
      };
    }

    return {
      ...parameter,
      currentValue: clampValue(parameter.currentValue, minValue, maxValue),
    };
  });
}

function formatCooldownDuration(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getDisplayCharacterName(
  rawName: string | null | undefined,
  isLoading: boolean
) {
  if (isLoading) {
    return "Name";
  }

  const trimmedName = rawName?.trim() || "Name";

  if (trimmedName.length <= PLAYER_TABLET_CHARACTER_NAME_MAX_LENGTH) {
    return trimmedName;
  }

  return trimmedName.slice(0, PLAYER_TABLET_CHARACTER_NAME_MAX_LENGTH).trimEnd();
}

function getCharacterNameFontSize(name: string) {
  if (name.length > 28) {
    return 28;
  }

  if (name.length > 22) {
    return 32;
  }

  if (name.length > 16) {
    return 36;
  }

  return 42;
}

function isCharacterNameOverLimit(name: string) {
  return name.length > PLAYER_TABLET_CHARACTER_NAME_MAX_LENGTH;
}

function normalizeDomainSkill(
  skill: TabletPlayerDomainSkill,
  domainLevel: number,
  fallbackName: string
): TabletPlayerDomainSkill {
  const skillLevel = skill.isPrimary ? domainLevel : skill.level;

  return {
    ...skill,
    name: skill.name.trim() || fallbackName,
    description: skill.description?.trim() || null,
    iconKey: skill.iconKey ?? "book",
    level: clampValue(
      skillLevel,
      PLAYER_TABLET_DOMAIN_MIN_LEVEL,
      PLAYER_TABLET_DOMAIN_MAX_LEVEL
    ),
    metadata: {
      ...(skill.metadata ?? {}),
      icon_key: skill.iconKey ?? "book",
    },
  };
}

function normalizeDomain(
  domain: TabletPlayerDomain,
  index: number
): TabletPlayerDomain {
  const level = clampValue(
    domain.level,
    PLAYER_TABLET_DOMAIN_MIN_LEVEL,
    PLAYER_TABLET_DOMAIN_MAX_LEVEL
  );

  return {
    ...domain,
    name: domain.name.trim() || `Domain ${index + 1}`,
    description: domain.description?.trim() || null,
    iconKey: domain.iconKey ?? defaultDomainIcons[index % defaultDomainIcons.length],
    level,
    sortOrder: index,
    metadata: domain.metadata ?? {},
    skills: domain.skills.map((skill, skillIndex) =>
      normalizeDomainSkill(skill, level, `Skill ${skillIndex + 1}`)
    ),
  };
}

function normalizeDomains(domains: TabletPlayerDomain[]) {
  return ensurePlayerDomains(domains)
    .slice(0, PLAYER_TABLET_MAX_DOMAINS)
    .map(normalizeDomain);
}

function haveDomainsChanged(
  originalDomains: TabletPlayerDomain[],
  draftDomains: TabletPlayerDomain[]
) {
  if (originalDomains.length !== draftDomains.length) {
    return true;
  }

  return draftDomains.some((draftDomain) => {
    const originalDomain = originalDomains.find(
      (domain) => domain.id === draftDomain.id
    );

    if (!originalDomain || draftDomain.isDraft) {
      return true;
    }

    if (
      originalDomain.key !== draftDomain.key ||
      originalDomain.name !== draftDomain.name ||
      (originalDomain.description ?? null) !==
        (draftDomain.description ?? null) ||
      (originalDomain.iconKey ?? null) !== (draftDomain.iconKey ?? null) ||
      originalDomain.level !== draftDomain.level ||
      originalDomain.sortOrder !== draftDomain.sortOrder ||
      JSON.stringify(originalDomain.metadata) !==
        JSON.stringify(draftDomain.metadata) ||
      originalDomain.skills.length !== draftDomain.skills.length
    ) {
      return true;
    }

    return draftDomain.skills.some((draftSkill) => {
      const originalSkill = originalDomain.skills.find(
        (skill) => skill.id === draftSkill.id
      );

      return (
        !originalSkill ||
        draftSkill.isDraft ||
        originalSkill.key !== draftSkill.key ||
        originalSkill.name !== draftSkill.name ||
        (originalSkill.description ?? null) !==
          (draftSkill.description ?? null) ||
        (originalSkill.iconKey ?? null) !== (draftSkill.iconKey ?? null) ||
        originalSkill.isPrimary !== draftSkill.isPrimary ||
        originalSkill.level !== draftSkill.level ||
        originalSkill.sortOrder !== draftSkill.sortOrder ||
        JSON.stringify(originalSkill.metadata) !==
          JSON.stringify(draftSkill.metadata)
      );
    });
  });
}

function buildSavePatch(
  originalCharacter: TabletPlayerCharacter,
  draft: TabletPlayerCharacterDraft,
  nextAvatarUrl: string | null
): TabletPlayerCharacterSavePatch | null {
  const characterPatch: NonNullable<TabletPlayerCharacterSavePatch["character"]> = {};
  const nextName = draft.name.trim();
  const nextDescription = draft.description.trim() || null;

  if (nextName !== originalCharacter.name) {
    characterPatch.name = nextName;
  }

  if (nextDescription !== (originalCharacter.description ?? null)) {
    characterPatch.description = nextDescription;
  }

  if (nextAvatarUrl !== originalCharacter.avatarUrl) {
    characterPatch.avatarUrl = nextAvatarUrl;
  }

  const attributes = draft.attributes
    .filter((draftAttribute) => {
      const originalAttribute = originalCharacter.attributes.find(
        (attribute) => attribute.id === draftAttribute.id
      );

      return originalAttribute && originalAttribute.value !== draftAttribute.value;
    })
    .map((attribute) => ({
      id: attribute.id,
      value: attribute.value,
    }));

  const parameters = draft.parameters
    .filter((draftParameter) => {
      const originalParameter = originalCharacter.parameters.find(
        (parameter) => parameter.id === draftParameter.id
      );

      return (
        originalParameter &&
        originalParameter.currentValue !== draftParameter.currentValue
      );
    })
    .map((parameter) => ({
      id: parameter.id,
      currentValue: parameter.currentValue,
    }));
  const originalDomains = originalCharacter.domains;
  const domains = haveDomainsChanged(originalDomains, draft.domains)
    ? draft.domains
    : undefined;

  if (
    !Object.keys(characterPatch).length &&
    !attributes.length &&
    !parameters.length &&
    !domains
  ) {
    return null;
  }

  return {
    id: originalCharacter.id,
    character: Object.keys(characterPatch).length ? characterPatch : undefined,
    attributes,
    parameters,
    domains,
  };
}

function PlayerTabletShellLayout({
  activeTab,
  onTabChange,
  viewerUserId,
  mode,
  targetRole,
  onClose,
  sessionId,
  inGameWorldId,
  participants,
  playerCharacter,
  isPlayerCharacterLoading,
  playerCharacterError,
  onPlayerCharacterSaved,
}: SharedShellLayoutProps) {
  const isEditable = canEditTablet(targetRole, mode);
  const showEditButton = isEditable && editablePlayerTabs.includes(activeTab);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState<TabletPlayerCharacterDraft>(() =>
    createDraftFromCharacter(playerCharacter)
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [portraitCooldownEndsAt, setPortraitCooldownEndsAt] = useState<
    number | null
  >(null);
  const [portraitCooldownNow, setPortraitCooldownNow] = useState(() =>
    Date.now()
  );
  const [showPortraitCooldownNotice, setShowPortraitCooldownNotice] =
    useState(false);
  const characterNameTextRef = useRef<HTMLSpanElement>(null);
  const [isCharacterNameOverflowing, setIsCharacterNameOverflowing] =
    useState(false);
  const fullCharacterName =
    !isPlayerCharacterLoading && playerCharacter?.name?.trim()
      ? playerCharacter.name.trim()
      : "Name";
  const characterName = getDisplayCharacterName(
    fullCharacterName,
    isPlayerCharacterLoading
  );
  const characterNameFontSize = getCharacterNameFontSize(characterName);
  const isCharacterNameClipped = isCharacterNameOverLimit(fullCharacterName);
  const shouldMaskCharacterName =
    isCharacterNameClipped || isCharacterNameOverflowing;
  const characterNameMaskStyle = shouldMaskCharacterName
    ? {
        WebkitMaskImage:
          "linear-gradient(to right, #000 0%, #000 calc(100% - 86px), rgba(0, 0, 0, 0.72) calc(100% - 44px), transparent calc(100% - 4px))",
        maskImage:
          "linear-gradient(to right, #000 0%, #000 calc(100% - 86px), rgba(0, 0, 0, 0.72) calc(100% - 44px), transparent calc(100% - 4px))",
      }
    : undefined;
  const playerAttributes =
    playerCharacter?.attributes.length
      ? playerCharacter.attributes.map((attribute) => ({
          id: attribute.id,
          key: attribute.key,
          iconKey: attribute.iconKey,
          label: attribute.label,
          value: attribute.value,
          sortOrder: attribute.sortOrder,
        }))
      : defaultPlayerAttributes.map((attribute, index) => ({
          id: attribute.key,
          key: attribute.key,
          iconKey: attribute.key,
          label: attribute.label,
          value: attribute.value,
          sortOrder: index,
        }));
  const playerParameters =
    playerCharacter?.parameters.length
      ? playerCharacter.parameters.map((parameter) => ({
          id: parameter.id,
          key: parameter.key,
          iconKey: parameter.iconKey,
          label: parameter.label,
          currentValue: parameter.currentValue,
          maxValue: parameter.maxValue,
          sortOrder: parameter.sortOrder,
        }))
      : defaultPlayerParameters.map((parameter, index) => ({
          id: parameter.key,
          key: parameter.key,
          iconKey: parameter.key,
          label: parameter.label,
          currentValue: parameter.value,
          maxValue: null,
          sortOrder: index,
        }));
  const visibleAttributes = isEditMode && draft.attributes.length
    ? draft.attributes
    : playerAttributes;
  const visibleParameters = isEditMode && draft.parameters.length
    ? draft.parameters
    : playerParameters;
  const portraitCooldownRemainingMs = portraitCooldownEndsAt
    ? Math.max(0, portraitCooldownEndsAt - portraitCooldownNow)
    : 0;
  const isPortraitCooldownActive = portraitCooldownRemainingMs > 0;
  const portraitStatusMessage = useMemo(() => {
    if (isSaving && draft.portraitFile) {
      return "Uploading portrait...";
    }

    if (portraitError) {
      return portraitError;
    }

    if (showPortraitCooldownNotice && isPortraitCooldownActive) {
      return `Change portrait in ${formatCooldownDuration(
        portraitCooldownRemainingMs
      )}`;
    }

    return null;
  }, [
    draft.portraitFile,
    isPortraitCooldownActive,
    isSaving,
    portraitCooldownRemainingMs,
    portraitError,
    showPortraitCooldownNotice,
  ]);

  useEffect(() => {
    return () => {
      if (draft.portraitPreviewUrl) {
        URL.revokeObjectURL(draft.portraitPreviewUrl);
      }
    };
  }, [draft.portraitPreviewUrl]);

  useEffect(() => {
    if (!portraitCooldownEndsAt) return;

    const intervalId = window.setInterval(() => {
      setPortraitCooldownNow(Date.now());
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      setPortraitCooldownEndsAt(null);
      setPortraitCooldownNow(Date.now());
      setShowPortraitCooldownNotice(false);
    }, Math.max(0, portraitCooldownEndsAt - Date.now()));

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [portraitCooldownEndsAt]);

  useEffect(() => {
    if (!showPortraitCooldownNotice) return;

    const timeoutId = window.setTimeout(() => {
      setShowPortraitCooldownNotice(false);
    }, PLAYER_TABLET_PORTRAIT_COOLDOWN_NOTICE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showPortraitCooldownNotice]);

  useEffect(() => {
    if (isEditMode) return;

    const nameElement = characterNameTextRef.current;

    if (!nameElement) return;

    const updateOverflowState = () => {
      const nextIsOverflowing =
        nameElement.scrollWidth > nameElement.clientWidth + 1;

      setIsCharacterNameOverflowing((currentIsOverflowing) =>
        currentIsOverflowing === nextIsOverflowing
          ? currentIsOverflowing
          : nextIsOverflowing
      );
    };
    let animationFrameId = window.requestAnimationFrame(updateOverflowState);

    const scheduleOverflowUpdate = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(updateOverflowState);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleOverflowUpdate);

    resizeObserver?.observe(nameElement);
    window.addEventListener("resize", scheduleOverflowUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleOverflowUpdate);
    };
  }, [characterName, characterNameFontSize, isEditMode]);

  const handleEditToggle = () => {
    if (!playerCharacter || !showEditButton || isSaving) return;

    setDraft(createDraftFromCharacter(playerCharacter));
    setSaveError(null);
    setPortraitError(null);
    setIsEditMode(true);
  };

  const handleNameChange = (value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      name: value.slice(0, PLAYER_TABLET_CHARACTER_NAME_MAX_LENGTH),
    }));
    setSaveError(null);
  };

  const handleDescriptionChange = (value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      description: value,
    }));
    setSaveError(null);
  };

  const handleAttributeDelta = (attributeId: string, delta: number) => {
    setDraft((currentDraft) => {
      const nextAttributes = currentDraft.attributes.map((attribute) =>
        attribute.id === attributeId
          ? {
              ...attribute,
              value: clampValue(
                attribute.value + delta,
                PLAYER_TABLET_ATTRIBUTE_MIN_VALUE,
                PLAYER_TABLET_ATTRIBUTE_MAX_VALUE
              ),
            }
          : attribute
      );

      return {
        ...currentDraft,
        attributes: nextAttributes,
        parameters: normalizeParameterValues(
          nextAttributes,
          currentDraft.parameters
        ),
      };
    });
  };

  const handleParameterDelta = (parameterId: string, delta: number) => {
    setDraft((currentDraft) => {
      const nextParameters = currentDraft.parameters.map((parameter) =>
        parameter.id === parameterId
          ? {
              ...parameter,
              currentValue: Math.max(
                PLAYER_TABLET_PARAMETER_MIN_VALUE,
                parameter.currentValue + delta
              ),
            }
          : parameter
      );

      return {
        ...currentDraft,
        parameters: normalizeParameterValues(
          currentDraft.attributes,
          nextParameters
        ),
      };
    });
  };

  const handleDomainAdd = () => {
    let addedDomainId: string | null = null;

    setDraft((currentDraft) => {
      if (currentDraft.domains.length >= PLAYER_TABLET_MAX_DOMAINS) {
        return currentDraft;
      }

      const nextDomain = createDefaultDomain(currentDraft.domains.length);
      addedDomainId = nextDomain.id;

      return {
        ...currentDraft,
        domains: normalizeDomains([...currentDraft.domains, nextDomain]),
      };
    });

    setSaveError(null);
    return addedDomainId;
  };

  const handleDomainDelete = (domainId: string) => {
    setDraft((currentDraft) => {
      if (currentDraft.domains.length <= 1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        domains: normalizeDomains(
          currentDraft.domains.filter((domain) => domain.id !== domainId)
        ),
      };
    });
    setSaveError(null);
  };

  const handleDomainNameChange = (domainId: string, value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              name: value,
            }
          : domain
      ),
    }));
    setSaveError(null);
  };

  const handleDomainIconChange = (domainId: string, iconKey: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              iconKey,
            }
          : domain
      ),
    }));
    setSaveError(null);
  };

  const handleDomainLevelChange = (domainId: string, level: number) => {
    const nextLevel = clampValue(
      level,
      PLAYER_TABLET_DOMAIN_MIN_LEVEL,
      PLAYER_TABLET_DOMAIN_MAX_LEVEL
    );

    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              level: nextLevel,
              skills: domain.skills.map((skill) =>
                skill.isPrimary
                  ? {
                      ...skill,
                      level: nextLevel,
                    }
                  : skill
              ),
            }
          : domain
      ),
    }));
    setSaveError(null);
  };

  const handleDomainSkillNameChange = (
    domainId: string,
    skillId: string,
    value: string
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              skills: domain.skills.map((skill) =>
                skill.id === skillId
                  ? {
                      ...skill,
                      name: value,
                    }
                  : skill
              ),
            }
          : domain
      ),
    }));
    setSaveError(null);
  };

  const handleDomainSkillAdd = (domainId: string) => {
    let addedSkillId: string | null = null;

    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) => {
        if (domain.id !== domainId) {
          return domain;
        }

        const nextSkill = createDefaultSkill(domain, domain.skills.length);
        addedSkillId = nextSkill.id;

        return {
          ...domain,
          skills: [...domain.skills, nextSkill],
        };
      }),
    }));
    setSaveError(null);
    return addedSkillId;
  };

  const handleDomainSkillDelete = (domainId: string, skillId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) => {
        if (domain.id !== domainId) {
          return domain;
        }

        const targetSkill = domain.skills.find((skill) => skill.id === skillId);

        if (targetSkill?.isPrimary) {
          return domain;
        }

        return {
          ...domain,
          skills: domain.skills
            .filter((skill) => skill.id !== skillId)
            .map((skill, index) => ({
              ...skill,
              sortOrder: index,
            })),
        };
      }),
    }));
    setSaveError(null);
  };

  const handleDomainSkillDescriptionChange = (
    domainId: string,
    skillId: string,
    value: string
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              skills: domain.skills.map((skill) =>
                skill.id === skillId
                  ? {
                      ...skill,
                      description: value,
                    }
                  : skill
              ),
            }
          : domain
      ),
    }));
    setSaveError(null);
  };

  const handleDomainSkillIconChange = (
    domainId: string,
    skillId: string,
    iconKey: string
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              skills: domain.skills.map((skill) =>
                skill.id === skillId
                  ? {
                      ...skill,
                      iconKey,
                      metadata: {
                        ...(skill.metadata ?? {}),
                        icon_key: iconKey,
                      },
                    }
                  : skill
              ),
            }
          : domain
      ),
    }));
    setSaveError(null);
  };

  const handleDomainSkillLevelChange = (
    domainId: string,
    skillId: string,
    level: number
  ) => {
    const nextLevel = clampValue(
      level,
      PLAYER_TABLET_DOMAIN_MIN_LEVEL,
      PLAYER_TABLET_DOMAIN_MAX_LEVEL
    );

    setDraft((currentDraft) => ({
      ...currentDraft,
      domains: currentDraft.domains.map((domain) => {
        if (domain.id !== domainId) {
          return domain;
        }

        const targetSkill = domain.skills.find((skill) => skill.id === skillId);

        if (targetSkill?.isPrimary) {
          return {
            ...domain,
            level: nextLevel,
            skills: domain.skills.map((skill) =>
              skill.isPrimary
                ? {
                    ...skill,
                    level: nextLevel,
                  }
                : skill
            ),
          };
        }

        return {
          ...domain,
          skills: domain.skills.map((skill) =>
            skill.id === skillId
              ? {
                  ...skill,
                  level: nextLevel,
                }
              : skill
          ),
        };
      }),
    }));
    setSaveError(null);
  };

  const validateCustomIconFile = (file: File) => {
    if (!PLAYER_TABLET_PORTRAIT_ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Only JPG, PNG, WEBP, or GIF images are allowed";
    }

    if (file.size > PLAYER_TABLET_CUSTOM_ICON_MAX_FILE_SIZE_BYTES) {
      return "Icon must be 3 MB or smaller";
    }

    return null;
  };

  const handleDomainIconFileSelect = async (
    domainId: string,
    file: File | null
  ) => {
    if (!file || !playerCharacter || isSaving) return;

    const validationError = validateCustomIconFile(file);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    try {
      const iconUrl = await uploadTabletPlayerCustomIcon(
        viewerUserId,
        playerCharacter.id,
        domainId,
        "domain",
        file
      );

      setDraft((currentDraft) => ({
        ...currentDraft,
        domains: currentDraft.domains.map((domain) =>
          domain.id === domainId
            ? {
                ...domain,
                iconKey: iconUrl,
                metadata: {
                  ...(domain.metadata ?? {}),
                  custom_icon_url: iconUrl,
                },
              }
            : domain
        ),
      }));
      setSaveError(null);
    } catch (error) {
      console.error(error);
      setSaveError("Could not upload icon");
    }
  };

  const handleDomainSkillIconFileSelect = async (
    domainId: string,
    skillId: string,
    file: File | null
  ) => {
    if (!file || !playerCharacter || isSaving) return;

    const validationError = validateCustomIconFile(file);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    try {
      const iconUrl = await uploadTabletPlayerCustomIcon(
        viewerUserId,
        playerCharacter.id,
        skillId,
        "skill",
        file
      );

      setDraft((currentDraft) => ({
        ...currentDraft,
        domains: currentDraft.domains.map((domain) =>
          domain.id === domainId
            ? {
                ...domain,
                skills: domain.skills.map((skill) =>
                  skill.id === skillId
                    ? {
                        ...skill,
                        iconKey: iconUrl,
                        metadata: {
                          ...(skill.metadata ?? {}),
                          icon_key: iconUrl,
                          custom_icon_url: iconUrl,
                        },
                      }
                    : skill
                ),
              }
            : domain
        ),
      }));
      setSaveError(null);
    } catch (error) {
      console.error(error);
      setSaveError("Could not upload icon");
    }
  };

  const handlePortraitChangeRequest = () => {
    if (!isEditMode || isSaving) return false;

    const now = Date.now();

    if (portraitCooldownEndsAt && portraitCooldownEndsAt > now) {
      setPortraitCooldownNow(now);
      setPortraitError(null);
      setShowPortraitCooldownNotice(true);
      return false;
    }

    setPortraitError(null);
    setShowPortraitCooldownNotice(false);
    return true;
  };

  const handlePortraitFileSelect = (file: File | null) => {
    if (!file) return;

    if (!PLAYER_TABLET_PORTRAIT_ALLOWED_MIME_TYPES.includes(file.type)) {
      setPortraitError("Only JPG, PNG, WEBP, or GIF images are allowed");
      return;
    }

    if (file.size > PLAYER_TABLET_PORTRAIT_MAX_FILE_SIZE_BYTES) {
      setPortraitError("Portrait must be 5 MB or smaller");
      return;
    }

    setDraft((currentDraft) => {
      if (currentDraft.portraitPreviewUrl) {
        URL.revokeObjectURL(currentDraft.portraitPreviewUrl);
      }
      const portraitPreviewUrl = URL.createObjectURL(file);

      return {
        ...currentDraft,
        avatarUrl: portraitPreviewUrl,
        portraitFile: file,
        portraitPreviewUrl,
      };
    });
    setPortraitError(null);
  };

  const handleSave = async () => {
    if (!playerCharacter || isSaving) return;

    const nextName = draft.name.trim();

    if (!nextName) {
      setSaveError("Character name cannot be empty");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setPortraitError(null);

    try {
      const nextAvatarUrl = draft.portraitFile
        ? await uploadTabletPlayerPortrait(
            viewerUserId,
            playerCharacter.id,
            draft.portraitFile
          )
        : draft.avatarUrl;
      const normalizedParameters = normalizeParameterValues(
        draft.attributes,
        draft.parameters
      );
      const normalizedDomains = normalizeDomains(draft.domains);
      const normalizedDraft = {
        ...draft,
        name: nextName,
        description: draft.description,
        avatarUrl: nextAvatarUrl,
        parameters: normalizedParameters,
        domains: normalizedDomains,
      };
      const patch = buildSavePatch(playerCharacter, normalizedDraft, nextAvatarUrl);
      const saveResult = patch
        ? await saveTabletPlayerCharacterPatch(patch)
        : {};

      const savedDomains =
        saveResult.domains ?? normalizedDraft.domains.map(cloneDomain);

      const savedCharacter: TabletPlayerCharacter = {
        ...playerCharacter,
        name: nextName,
        description: draft.description.trim() || null,
        avatarUrl: nextAvatarUrl,
        attributes: normalizedDraft.attributes.map(cloneAttribute),
        parameters: normalizedDraft.parameters.map(cloneParameter),
        domains: savedDomains,
      };

      if (draft.portraitFile) {
        setPortraitCooldownEndsAt(
          Date.now() + PLAYER_TABLET_PORTRAIT_UPDATE_COOLDOWN_MS
        );
      }

      if (draft.portraitPreviewUrl) {
        URL.revokeObjectURL(draft.portraitPreviewUrl);
      }

      setDraft(createDraftFromCharacter(savedCharacter));
      onPlayerCharacterSaved(savedCharacter);
      setIsEditMode(false);
    } catch (error) {
      console.error(error);
      setSaveError("Could not save character changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExperiencesSaved = (
    experiences: TabletPlayerExperience[]
  ) => {
    if (!playerCharacter) return;

    onPlayerCharacterSaved({
      ...playerCharacter,
      experiences,
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white bg-[#172033] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="absolute bottom-0 left-0 top-0 w-[112px] border-r border-white/45">
        <TabletNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          targetRole={targetRole}
          mode={mode}
          onClose={onClose}
        />
      </div>

      <div className="absolute left-[148px] right-[116px] top-[30px] flex h-[58px] items-center">
        {isEditMode ? (
          <input
            value={draft.name}
            onChange={(event) => handleNameChange(event.target.value)}
            maxLength={PLAYER_TABLET_CHARACTER_NAME_MAX_LENGTH}
            className="h-[54px] w-[420px] rounded-[14px] border border-white/35 bg-white/8 px-[16px] font-montserrat-alt text-[34px] font-extrabold leading-none text-white outline-none focus:border-white"
            aria-label="Character name"
          />
        ) : (
          <h1
            className="relative w-[420px] overflow-hidden whitespace-nowrap font-montserrat-alt font-extrabold leading-none text-white"
            title={fullCharacterName}
            style={{ fontSize: `${characterNameFontSize}px` }}
          >
            <span
              ref={characterNameTextRef}
              className="block"
              style={characterNameMaskStyle}
            >
              {characterName}
            </span>
          </h1>
        )}

        <div className="flex flex-1 items-center justify-end gap-[28px]">
          {visibleAttributes.map((attribute) => {
            const iconSrc =
              attributeIconSrcByKey[attribute.key] ??
              attributeIconSrcByKey[attribute.iconKey] ??
              attributeIconSrcByKey.constitution;

            return (
              <div
                key={attribute.id}
                className="flex min-w-[76px] items-center justify-center gap-[8px]"
              >
                <Image src={iconSrc} alt="" width={43} height={43} />
                <span className="font-montserrat-alt text-[28px] font-extrabold leading-none text-white">
                  {attribute.value}
                </span>
                {isEditMode ? (
                  <div className="flex flex-col gap-[3px]">
                    <button
                      type="button"
                      onClick={() => handleAttributeDelta(attribute.id, 1)}
                      disabled={
                        attribute.value >= PLAYER_TABLET_ATTRIBUTE_MAX_VALUE
                      }
                      className="flex h-[18px] w-[22px] items-center justify-center rounded-[6px] border border-white/55 bg-transparent text-[15px] font-black leading-none text-white disabled:opacity-35"
                      aria-label={`Increase ${attribute.label}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttributeDelta(attribute.id, -1)}
                      disabled={
                        attribute.value <= PLAYER_TABLET_ATTRIBUTE_MIN_VALUE
                      }
                      className="flex h-[18px] w-[22px] items-center justify-center rounded-[6px] border border-white/55 bg-transparent text-[15px] font-black leading-none text-white disabled:opacity-35"
                      aria-label={`Decrease ${attribute.label}`}
                    >
                      -
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {showEditButton ? (
        <button
          type="button"
          onClick={isEditMode ? handleSave : handleEditToggle}
          disabled={isSaving || (!isEditMode && !playerCharacter)}
          className="absolute right-[18px] top-[22px] flex w-[78px] flex-col items-center justify-center gap-[4px] rounded-[14px] py-[4px] text-white transition-opacity duration-200 hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-45"
          title={isEditMode ? "Save character" : "Edit character"}
        >
          <Image
            src={isEditMode ? "/save-icon.svg" : "/Edit-icon.png"}
            alt=""
            width={32}
            height={32}
            className={isEditMode ? "invert" : undefined}
          />
          <span className="font-montserrat text-[16px] font-bold leading-none">
            {isEditMode ? "Save" : "Edit"}
          </span>
        </button>
      ) : null}

      {saveError ? (
        <p className="absolute right-[116px] top-[88px] font-montserrat text-[14px] font-semibold text-[#FFB4B4]">
          {saveError}
        </p>
      ) : null}

      <div className="absolute bottom-[42px] right-[22px] flex w-[90px] flex-col gap-[46px]">
        {visibleParameters.map((parameter) => {
          const iconSrc =
            parameterIconSrcByKey[parameter.key] ??
            parameterIconSrcByKey[parameter.iconKey] ??
            parameterIconSrcByKey.health;
          const parameterMaxValue = getParameterMaxValue(
            parameter,
            visibleAttributes,
            visibleParameters
          );
          const isIncreaseDisabled =
            parameterMaxValue !== null &&
            parameter.currentValue >= parameterMaxValue;

          return (
            <div key={parameter.id} className="flex flex-col items-center">
              <Image src={iconSrc} alt="" width={55} height={55} />
              {isEditMode ? (
                <div className="mt-[20px] flex w-full items-center justify-center gap-[4px] font-montserrat-alt text-[27px] font-extrabold leading-none text-white">
                  <button
                    type="button"
                    onClick={() => handleParameterDelta(parameter.id, -1)}
                    disabled={
                      parameter.currentValue <=
                      PLAYER_TABLET_PARAMETER_MIN_VALUE
                    }
                    className="flex h-[40px] w-[28px] items-center justify-center leading-none disabled:opacity-35"
                    aria-label={`Decrease ${parameter.label}`}
                  >
                    -
                  </button>
                  <span className="min-w-[24px] text-center">
                    {parameter.currentValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleParameterDelta(parameter.id, 1)}
                    disabled={isIncreaseDisabled}
                    className="flex h-[40px] w-[28px] items-center justify-center leading-none disabled:opacity-35"
                    aria-label={`Increase ${parameter.label}`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="mt-[20px] font-montserrat-alt text-[27px] font-extrabold leading-none text-white">
                  {parameter.currentValue}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-[44px] left-[152px] right-[130px] top-[108px]">
        <TabletPageRenderer
          activeTab={activeTab}
          targetRole={targetRole}
          mode={mode}
          isEditable={isEditable}
          sessionId={sessionId}
          inGameWorldId={inGameWorldId}
          participants={participants}
          playerCharacter={playerCharacter}
          isPlayerCharacterLoading={isPlayerCharacterLoading}
          playerCharacterError={playerCharacterError}
          isEditMode={isEditMode}
          characterDraft={draft}
          portraitStatusMessage={portraitStatusMessage}
          isPortraitSelectionDisabled={isSaving}
          onDescriptionChange={handleDescriptionChange}
          onDomainAdd={handleDomainAdd}
          onDomainDelete={handleDomainDelete}
          onDomainNameChange={handleDomainNameChange}
          onDomainIconChange={handleDomainIconChange}
          onDomainIconFileSelect={handleDomainIconFileSelect}
          onDomainLevelChange={handleDomainLevelChange}
          onDomainSkillAdd={handleDomainSkillAdd}
          onDomainSkillDelete={handleDomainSkillDelete}
          onDomainSkillNameChange={handleDomainSkillNameChange}
          onDomainSkillIconChange={handleDomainSkillIconChange}
          onDomainSkillIconFileSelect={handleDomainSkillIconFileSelect}
          onDomainSkillDescriptionChange={handleDomainSkillDescriptionChange}
          onDomainSkillLevelChange={handleDomainSkillLevelChange}
          onPortraitChangeRequest={handlePortraitChangeRequest}
          onPortraitFileSelect={handlePortraitFileSelect}
          onExperiencesSaved={handleExperiencesSaved}
        />
      </div>
    </div>
  );
}

function MasterTabletShellLayout({
  activeTab,
  onTabChange,
  targetRole,
  mode,
  onClose,
  sessionId,
  inGameWorldId,
  participants,
}: SharedShellLayoutProps) {
  const isEditable = canEditTablet(targetRole, mode);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white/10 bg-[#1B2230] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-[16px] rounded-[28px] border border-white/8 bg-[#0F1724]" />

      <div className="absolute left-[24px] top-[24px] bottom-[24px] w-[92px] rounded-[26px] border border-white/8 bg-[#111827]">
        <TabletNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          targetRole={targetRole}
          mode={mode}
          onClose={onClose}
        />
      </div>

      <div className="absolute left-[136px] right-[24px] top-[24px] bottom-[24px] rounded-[28px] border border-white/8 bg-[#151D2B] p-[22px]">
        <TabletPageRenderer
          activeTab={activeTab}
          targetRole={targetRole}
          mode={mode}
          isEditable={isEditable}
          sessionId={sessionId}
          inGameWorldId={inGameWorldId}
          participants={participants}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default function TabletShell(props: TabletShellProps) {
  if (props.targetRole === "master") {
    return <MasterTabletShellLayout {...props} />;
  }

  return <PlayerTabletShellLayout {...props} />;
}
