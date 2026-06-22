'use client';

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import {
  PLAYER_TABLET_DOMAIN_MAX_LEVEL,
  PLAYER_TABLET_DOMAIN_MIN_LEVEL,
  PLAYER_TABLET_MAX_DOMAINS,
} from '@/features/tablet/player/constants';
import type {
  TabletPlayerCharacter,
  TabletPlayerCharacterDraft,
  TabletPlayerDomain,
  TabletPlayerDomainSkill,
} from '@/features/tablet/player/types';

type IconPreset = {
  key: string;
  label: string;
  src: string;
};

type IconPickerState =
  | {
      type: 'domain';
      domainId: string;
    }
  | {
      type: 'skill';
      domainId: string;
      skillId: string;
    }
  | null;

type TabletSkillsPageProps = {
  isEditable: boolean;
  character: TabletPlayerCharacter | null;
  isLoading: boolean;
  error: string | null;
  isEditMode: boolean;
  draft?: TabletPlayerCharacterDraft;
  onDomainAdd?: () => string | null | undefined;
  onDomainDelete?: (domainId: string) => void;
  onDomainNameChange?: (domainId: string, name: string) => void;
  onDomainIconChange?: (domainId: string, iconKey: string) => void;
  onDomainIconFileSelect?: (domainId: string, file: File | null) => void;
  onDomainLevelChange?: (domainId: string, level: number) => void;
  onDomainSkillAdd?: (domainId: string) => string | null | undefined;
  onDomainSkillDelete?: (domainId: string, skillId: string) => void;
  onDomainSkillNameChange?: (
    domainId: string,
    skillId: string,
    name: string
  ) => void;
  onDomainSkillIconChange?: (
    domainId: string,
    skillId: string,
    iconKey: string
  ) => void;
  onDomainSkillIconFileSelect?: (
    domainId: string,
    skillId: string,
    file: File | null
  ) => void;
  onDomainSkillDescriptionChange?: (
    domainId: string,
    skillId: string,
    description: string
  ) => void;
  onDomainSkillLevelChange?: (
    domainId: string,
    skillId: string,
    level: number
  ) => void;
};

const domainIconOptions: IconPreset[] = [
  {
    key: 'skills',
    label: 'Base domain',
    src: '/navigation-imgs/player/Skills.png',
  },
  {
    key: 'book',
    label: 'Lore',
    src: '/navigation-imgs/player/Diary.png',
  },
  {
    key: 'flask',
    label: 'Craft',
    src: '/attributes-imgs/Thinking.png',
  },
  {
    key: 'backpack',
    label: 'Gear',
    src: '/navigation-imgs/player/Backpack.png',
  },
  {
    key: 'heart',
    label: 'Vitality',
    src: '/parameters/Health.png',
  },
];

const skillIconOptions: IconPreset[] = [
  {
    key: 'book',
    label: 'Base skill',
    src: '/navigation-imgs/player/Diary.png',
  },
  {
    key: 'skills',
    label: 'Domain',
    src: '/navigation-imgs/player/Skills.png',
  },
  {
    key: 'flask',
    label: 'Craft',
    src: '/attributes-imgs/Thinking.png',
  },
  {
    key: 'backpack',
    label: 'Gear',
    src: '/navigation-imgs/player/Backpack.png',
  },
  {
    key: 'heart',
    label: 'Vitality',
    src: '/parameters/Health.png',
  },
];

const activeFrameSrc = '/tablet/master/scene/tabs/tab-active-frame-right.svg';
const skillsTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};
const fallbackDomain: TabletPlayerDomain = {
  id: 'fallback-domain',
  key: 'fallback-domain',
  name: 'Name of the Domain',
  description: null,
  iconKey: 'skills',
  level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
  sortOrder: 0,
  metadata: {},
  skills: [
    {
      id: 'fallback-domain-primary-skill',
      key: 'fallback-domain-primary-skill',
      name: 'Skill name',
      description: 'Skill description.',
      iconKey: 'book',
      isPrimary: true,
      level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
      sortOrder: 0,
      metadata: { icon_key: 'book' },
    },
    {
      id: 'fallback-domain-skill',
      key: 'fallback-domain-skill',
      name: 'Skill name',
      description: 'Skill description.',
      iconKey: 'book',
      isPrimary: false,
      level: PLAYER_TABLET_DOMAIN_MIN_LEVEL,
      sortOrder: 1,
      metadata: { icon_key: 'book' },
    },
  ],
};

function isCustomIconKey(iconKey: string | null | undefined) {
  return Boolean(
    iconKey &&
      (iconKey.startsWith('http://') ||
        iconKey.startsWith('https://') ||
        iconKey.startsWith('blob:') ||
        iconKey.startsWith('data:'))
  );
}

function getCustomIconUrl(
  metadata: Record<string, unknown>,
  iconKey: string | null | undefined
) {
  if (typeof metadata.custom_icon_url === 'string') {
    return metadata.custom_icon_url;
  }

  return isCustomIconKey(iconKey) ? iconKey ?? null : null;
}

function getIconSrc(
  iconKey: string | null | undefined,
  options: IconPreset[]
) {
  const presetIcon = options.find((option) => option.key === iconKey);

  if (presetIcon) {
    return presetIcon.src;
  }

  return isCustomIconKey(iconKey) ? iconKey ?? options[0].src : options[0].src;
}

function IconImage({
  iconKey,
  options,
  size,
  className = '',
}: {
  iconKey: string | null | undefined;
  options: IconPreset[];
  size: number;
  className?: string;
}) {
  const src = getIconSrc(iconKey, options);

  if (isCustomIconKey(src)) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        className={`object-cover ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}

function getDisplaySkills(domain: TabletPlayerDomain, isEditMode: boolean) {
  const skills = domain.skills.length
    ? domain.skills
    : fallbackDomain.skills.map((skill) => ({
        ...skill,
        id: `${domain.id}-${skill.id}`,
        key: `${domain.key}-${skill.key}`,
      }));

  if (isEditMode) {
    return skills;
  }

  return skills.filter((skill) => skill.isPrimary || domain.level >= skill.level);
}

function chunkSkills(skills: TabletPlayerDomainSkill[]) {
  const pages: TabletPlayerDomainSkill[][] = [];

  for (let index = 0; index < skills.length; index += 2) {
    pages.push(skills.slice(index, index + 2));
  }

  return pages.length ? pages : [[]];
}

function LevelDots({
  label,
  value,
  isEditable,
  onChange,
}: {
  label: string;
  value: number;
  isEditable: boolean;
  onChange?: (level: number) => void;
}) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const previewLevel = hoveredLevel ?? value;

  return (
    <div
      className="flex items-center gap-[5px]"
      onMouseLeave={() => setHoveredLevel(null)}
    >
      {Array.from({ length: PLAYER_TABLET_DOMAIN_MAX_LEVEL }).map((_, index) => {
        const level = index + 1;
        const isFilled = level <= previewLevel;
        const isActual = level <= value;

        return (
          <button
            key={level}
            type="button"
            disabled={!isEditable}
            onClick={() => onChange?.(level)}
            onMouseEnter={() => {
              if (isEditable) {
                setHoveredLevel(level);
              }
            }}
            title={
              isEditable
                ? `Set ${label} level ${level}`
                : `${label} level ${value}`
            }
            className="group flex h-[18px] w-[18px] items-center justify-center rounded-full disabled:cursor-default"
          >
            <span
              className={[
                'h-[11px] w-[11px] rounded-full border transition-colors duration-150',
                isFilled
                  ? 'border-white bg-white'
                  : 'border-white/75 bg-transparent',
                isEditable && !isActual && isFilled ? 'bg-white/70' : '',
                isEditable ? 'group-hover:border-white' : '',
              ].join(' ')}
            />
          </button>
        );
      })}
    </div>
  );
}

function IconPicker({
  iconKey,
  metadata,
  options,
  onPresetSelect,
  onFileSelect,
}: {
  iconKey: string | null | undefined;
  metadata: Record<string, unknown>;
  options: IconPreset[];
  onPresetSelect: (iconKey: string) => void;
  onFileSelect: (file: File | null) => void;
}) {
  const customIconUrl = getCustomIconUrl(metadata, iconKey);

  return (
    <div className="absolute left-0 top-[50px] z-40 grid w-[198px] grid-cols-3 gap-[8px] rounded-[18px] border border-white/25 bg-[#172033] p-[10px] shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onPresetSelect(option.key)}
          className={[
            'flex h-[48px] w-[54px] items-center justify-center rounded-[12px] border transition-colors hover:border-white',
            iconKey === option.key ? 'border-white' : 'border-white/15',
          ].join(' ')}
          title={option.label}
        >
          <IconImage iconKey={option.key} options={options} size={30} />
        </button>
      ))}

      <label
        className={[
          'flex h-[48px] w-[54px] cursor-pointer items-center justify-center overflow-hidden rounded-full border transition-colors hover:border-white',
          customIconUrl && iconKey === customIconUrl
            ? 'border-white'
            : 'border-white/25',
        ].join(' ')}
        title={customIconUrl ? 'Replace custom icon' : 'Upload custom icon'}
      >
        {customIconUrl ? (
          <IconImage iconKey={customIconUrl} options={options} size={48} />
        ) : (
          <span className="font-montserrat-alt text-[28px] font-extrabold leading-none text-white">
            +
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            onFileSelect(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

function SkillCard({
  domain,
  skill,
  isEditable,
  isEditMode,
  iconPicker,
  onIconPickerChange,
  onSkillNameChange,
  onSkillIconChange,
  onSkillIconFileSelect,
  onSkillDescriptionChange,
  onSkillLevelChange,
  onSkillDelete,
}: {
  domain: TabletPlayerDomain;
  skill: TabletPlayerDomainSkill;
  isEditable: boolean;
  isEditMode: boolean;
  iconPicker: IconPickerState;
  onIconPickerChange: (state: IconPickerState) => void;
  onSkillNameChange?: TabletSkillsPageProps['onDomainSkillNameChange'];
  onSkillIconChange?: TabletSkillsPageProps['onDomainSkillIconChange'];
  onSkillIconFileSelect?: TabletSkillsPageProps['onDomainSkillIconFileSelect'];
  onSkillDescriptionChange?: TabletSkillsPageProps['onDomainSkillDescriptionChange'];
  onSkillLevelChange?: TabletSkillsPageProps['onDomainSkillLevelChange'];
  onSkillDelete?: TabletSkillsPageProps['onDomainSkillDelete'];
}) {
  const displayLevel = skill.isPrimary ? domain.level : skill.level;
  const canEdit = isEditable && isEditMode;
  const isIconPickerOpen =
    iconPicker?.type === 'skill' &&
    iconPicker.domainId === domain.id &&
    iconPicker.skillId === skill.id;

  return (
    <article
      className={[
        'relative min-h-[238px] max-w-[345px] rounded-[22px] px-[14px] py-[14px] text-white',
        skill.isPrimary
          ? 'border border-white/55 bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.08)]'
          : 'border border-white/10 bg-transparent',
      ].join(' ')}
    >
      {skill.isPrimary ? (
        <span className="absolute right-[12px] top-[-13px] rounded-full border border-white/55 bg-[#172033] px-[12px] py-[4px] font-montserrat text-[12px] font-bold uppercase tracking-[0.08em] text-white">
          Main
        </span>
      ) : canEdit ? (
        <button
          type="button"
          onClick={() => onSkillDelete?.(domain.id, skill.id)}
          className="absolute right-[10px] top-[-13px] rounded-full border border-white/25 bg-[#172033] px-[10px] py-[4px] font-montserrat text-[12px] font-bold text-white transition-colors hover:border-white"
          title="Delete skill"
        >
          Delete
        </button>
      ) : null}

      <div className="flex items-center gap-[10px]">
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() =>
              onIconPickerChange(isIconPickerOpen ? null : {
                type: 'skill',
                domainId: domain.id,
                skillId: skill.id,
              })
            }
            className="flex h-[36px] w-[36px] items-center justify-center overflow-hidden rounded-full border border-white transition-colors disabled:cursor-default"
            title={canEdit ? 'Change skill icon' : skill.name}
          >
            <IconImage
              iconKey={skill.iconKey}
              options={skillIconOptions}
              size={23}
            />
          </button>

          {canEdit && isIconPickerOpen ? (
            <IconPicker
              iconKey={skill.iconKey}
              metadata={skill.metadata}
              options={skillIconOptions}
              onPresetSelect={(iconKey) => {
                onSkillIconChange?.(domain.id, skill.id, iconKey);
                onIconPickerChange(null);
              }}
              onFileSelect={(file) => {
                onSkillIconFileSelect?.(domain.id, skill.id, file);
                onIconPickerChange(null);
              }}
            />
          ) : null}
        </div>

        {canEdit ? (
          <input
            value={skill.name}
            onChange={(event) =>
              onSkillNameChange?.(domain.id, skill.id, event.target.value)
            }
            className="h-[36px] min-w-0 flex-1 rounded-[12px] border border-white/25 bg-white/8 px-[10px] font-montserrat-alt text-[20px] font-extrabold leading-none text-white outline-none focus:border-white"
            aria-label="Skill name"
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate font-montserrat-alt text-[23px] font-extrabold leading-none">
            {skill.name}
          </h3>
        )}

        <LevelDots
          label={skill.name}
          value={displayLevel}
          isEditable={canEdit}
          onChange={(level) => onSkillLevelChange?.(domain.id, skill.id, level)}
        />
      </div>

      {canEdit ? (
        <textarea
          value={skill.description ?? ''}
          onChange={(event) =>
            onSkillDescriptionChange?.(domain.id, skill.id, event.target.value)
          }
          className="mt-[12px] h-[158px] w-full resize-none rounded-[14px] border border-white/20 bg-white/8 px-[12px] py-[10px] font-montserrat text-[17px] font-medium leading-[1.2] text-white outline-none placeholder:text-white/40 focus:border-white"
          aria-label={`${skill.name} description`}
          placeholder="Skill description"
        />
      ) : (
        <p className="mt-[12px] font-montserrat text-[18px] font-medium leading-[1.18] text-white/85">
          {skill.description || 'No skill description yet.'}
        </p>
      )}
    </article>
  );
}

export default function TabletSkillsPage({
  isEditable,
  character,
  isLoading,
  error,
  isEditMode,
  draft,
  onDomainAdd,
  onDomainDelete,
  onDomainNameChange,
  onDomainIconChange,
  onDomainIconFileSelect,
  onDomainLevelChange,
  onDomainSkillAdd,
  onDomainSkillDelete,
  onDomainSkillNameChange,
  onDomainSkillIconChange,
  onDomainSkillIconFileSelect,
  onDomainSkillDescriptionChange,
  onDomainSkillLevelChange,
}: TabletSkillsPageProps) {
  const domains = useMemo(() => {
    const sourceDomains = isEditMode
      ? draft?.domains ?? []
      : character?.domains ?? [];

    return (sourceDomains.length ? sourceDomains : [fallbackDomain]).slice(
      0,
      PLAYER_TABLET_MAX_DOMAINS
    );
  }, [character?.domains, draft?.domains, isEditMode]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [domainDirection, setDomainDirection] = useState(1);
  const [skillPage, setSkillPage] = useState(0);
  const [iconPicker, setIconPicker] = useState<IconPickerState>(null);
  const activeDomainId =
    domains.find((domain) => domain.id === selectedDomainId)?.id ??
    domains[0]?.id ??
    null;

  const activeDomainIndex = Math.max(
    0,
    domains.findIndex((domain) => domain.id === activeDomainId)
  );
  const activeDomain = domains[activeDomainIndex] ?? null;
  const visibleSkills = activeDomain
    ? getDisplaySkills(activeDomain, isEditMode)
    : [];
  const skillPages = chunkSkills(visibleSkills);
  const currentSkillPage = Math.min(skillPage, skillPages.length - 1);
  const currentSkills = skillPages[currentSkillPage] ?? [];
  const canEdit = isEditable && isEditMode;
  const isDomainIconPickerOpen =
    iconPicker?.type === 'domain' && iconPicker.domainId === activeDomain?.id;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center font-montserrat-alt text-[24px] font-extrabold text-white/70">
        Loading skills...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center font-montserrat-alt text-[24px] font-extrabold text-white/70">
        Character skills are unavailable right now.
      </div>
    );
  }

  if (!activeDomain) {
    return (
      <div className="flex h-full items-center justify-center font-montserrat-alt text-[24px] font-extrabold text-white/70">
        No domains yet.
      </div>
    );
  }

  const handleDomainSelect = (domainId: string, nextIndex: number) => {
    setDomainDirection(nextIndex >= activeDomainIndex ? 1 : -1);
    setSelectedDomainId(domainId);
    setSkillPage(0);
    setIconPicker(null);
  };

  const handleAddDomain = () => {
    const addedDomainId = onDomainAdd?.();

    if (addedDomainId) {
      setDomainDirection(1);
      setSelectedDomainId(addedDomainId);
      setSkillPage(0);
      setIconPicker(null);
    }
  };

  const handleDeleteDomain = () => {
    if (domains.length <= 1) return;

    const nextDomain =
      domains[activeDomainIndex + 1] ?? domains[activeDomainIndex - 1] ?? null;

    onDomainDelete?.(activeDomain.id);
    setSelectedDomainId(nextDomain?.id ?? null);
    setSkillPage(0);
    setIconPicker(null);
  };

  const handleAddSkill = () => {
    onDomainSkillAdd?.(activeDomain.id);
    setSkillPage(Math.floor(visibleSkills.length / 2));
    setIconPicker(null);
  };

  return (
    <div className="relative h-full overflow-hidden text-white">
      <div className="absolute left-[34px] top-[126px] z-20">
        <div className="relative flex min-h-[88px] w-[74px] flex-col items-center justify-center gap-[8px] rounded-full bg-[#5C5C5C] px-[7px] py-[14px]">
          {domains.map((domain, index) => {
            const isActive = domain.id === activeDomain.id;

            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleDomainSelect(domain.id, index)}
                className="group relative flex h-[52px] w-[52px] items-center justify-center"
                title={domain.name}
              >
                {isActive ? (
                  <motion.span
                    layoutId="player-domain-active-frame"
                    className="pointer-events-none absolute h-[58px] w-[58px]"
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
                      sizes="58px"
                      className="object-contain"
                    />
                  </motion.span>
                ) : (
                  <span className="pointer-events-none absolute h-[58px] w-[58px] opacity-0 transition-opacity duration-200 group-hover:opacity-45">
                    <Image
                      src={activeFrameSrc}
                      alt=""
                      fill
                      sizes="58px"
                      className="object-contain"
                    />
                  </span>
                )}

                <IconImage
                  iconKey={domain.iconKey}
                  options={domainIconOptions}
                  size={33}
                  className="relative z-10 rounded-full"
                />
              </button>
            );
          })}

          {canEdit && domains.length < PLAYER_TABLET_MAX_DOMAINS ? (
            <button
              type="button"
              onClick={handleAddDomain}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/45 font-montserrat-alt text-[26px] font-extrabold leading-none text-white transition-colors hover:border-white"
              title="Add domain"
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-[8px] left-[144px] right-[44px] top-[62px]">
        <AnimatePresence mode="wait" custom={domainDirection}>
          <motion.div
            key={activeDomain.id}
            custom={domainDirection}
            initial={{
              opacity: 0,
              x: domainDirection === 1 ? 70 : -70,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: domainDirection === 1 ? -70 : 70,
            }}
            transition={skillsTransition}
            className="absolute inset-0"
          >
            <div className="flex h-full flex-col items-center">
              <div className="flex min-h-[58px] items-center justify-center gap-[16px]">
                <div className="relative">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      setIconPicker(
                        isDomainIconPickerOpen
                          ? null
                          : {
                              type: 'domain',
                              domainId: activeDomain.id,
                            }
                      )
                    }
                    className="flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-full border border-white/60 transition-colors hover:border-white disabled:cursor-default"
                    title={canEdit ? 'Change domain icon' : activeDomain.name}
                  >
                    <IconImage
                      iconKey={activeDomain.iconKey}
                      options={domainIconOptions}
                      size={34}
                    />
                  </button>

                  {canEdit && isDomainIconPickerOpen ? (
                    <IconPicker
                      iconKey={activeDomain.iconKey}
                      metadata={activeDomain.metadata}
                      options={domainIconOptions}
                      onPresetSelect={(iconKey) => {
                        onDomainIconChange?.(activeDomain.id, iconKey);
                        setIconPicker(null);
                      }}
                      onFileSelect={(file) => {
                        onDomainIconFileSelect?.(activeDomain.id, file);
                        setIconPicker(null);
                      }}
                    />
                  ) : null}
                </div>

                {canEdit ? (
                  <input
                    value={activeDomain.name}
                    onChange={(event) =>
                      onDomainNameChange?.(activeDomain.id, event.target.value)
                    }
                    className="h-[46px] w-[360px] rounded-[14px] border border-white/25 bg-white/8 px-[14px] text-center font-montserrat-alt text-[30px] font-extrabold leading-none text-white outline-none focus:border-white"
                    aria-label="Domain name"
                  />
                ) : (
                  <h2 className="max-w-[390px] truncate text-center font-montserrat-alt text-[34px] font-extrabold leading-none">
                    {activeDomain.name}
                  </h2>
                )}

                <LevelDots
                  label={activeDomain.name}
                  value={activeDomain.level}
                  isEditable={canEdit}
                  onChange={(level) =>
                    onDomainLevelChange?.(activeDomain.id, level)
                  }
                />

                {canEdit && domains.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleDeleteDomain}
                    className="rounded-full border border-white/25 px-[14px] py-[7px] font-montserrat text-[13px] font-bold text-white transition-colors hover:border-white"
                    title="Delete domain"
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              <div className="relative mt-[48px] flex w-full flex-1 items-start justify-center">
                <button
                  type="button"
                  onClick={() => setSkillPage((page) => Math.max(0, page - 1))}
                  disabled={currentSkillPage <= 0}
                  className="absolute left-[18px] top-[110px] flex h-[56px] w-[56px] items-center justify-center rounded-full border-[4px] border-white/65 font-montserrat-alt text-[34px] font-extrabold leading-none text-white transition-opacity hover:opacity-80 disabled:opacity-35"
                  title="Previous skills"
                >
                  {'<'}
                </button>

                <AnimatePresence mode="wait" custom={currentSkillPage}>
                  <motion.div
                    key={`${activeDomain.id}-${currentSkillPage}`}
                    initial={{ opacity: 0, x: 38 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -38 }}
                    transition={skillsTransition}
                    className="grid w-[790px] grid-cols-2 justify-items-center gap-[48px]"
                  >
                    {currentSkills.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        domain={activeDomain}
                        skill={skill}
                        isEditable={isEditable}
                        isEditMode={isEditMode}
                        iconPicker={iconPicker}
                        onIconPickerChange={setIconPicker}
                        onSkillNameChange={onDomainSkillNameChange}
                        onSkillIconChange={onDomainSkillIconChange}
                        onSkillIconFileSelect={onDomainSkillIconFileSelect}
                        onSkillDescriptionChange={
                          onDomainSkillDescriptionChange
                        }
                        onSkillLevelChange={onDomainSkillLevelChange}
                        onSkillDelete={onDomainSkillDelete}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() =>
                    setSkillPage((page) =>
                      Math.min(skillPages.length - 1, page + 1)
                    )
                  }
                  disabled={currentSkillPage >= skillPages.length - 1}
                  className="absolute right-[18px] top-[110px] flex h-[56px] w-[56px] items-center justify-center rounded-full border-[4px] border-white/80 font-montserrat-alt text-[34px] font-extrabold leading-none text-white transition-opacity hover:opacity-80 disabled:opacity-35"
                  title="Next skills"
                >
                  {'>'}
                </button>
              </div>

              <div className="mb-[12px] flex items-center gap-[12px]">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="rounded-full border border-white/30 px-[16px] py-[8px] font-montserrat text-[13px] font-bold text-white transition-colors hover:border-white"
                  >
                    Add skill
                  </button>
                ) : null}

                <div className="flex items-center gap-[7px]">
                  {skillPages.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSkillPage(index)}
                      className={[
                        'h-[13px] w-[13px] rounded-full border border-white transition-colors',
                        index === currentSkillPage
                          ? 'bg-white'
                          : 'bg-transparent',
                      ].join(' ')}
                      title={`Skill page ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
