'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import TabletSkillsPage from '@/components/tablet/pages/player/SkillsPage';
import StudioCharacterPage from './pages/StudioCharacterPage';
import StudioBackpackPage from './pages/StudioBackpackPage';
import StudioLibraryPage from './pages/StudioLibraryPage';
import StudioRelationshipsPage from './pages/StudioRelationshipsPage';
import StudioNotesPage from './pages/StudioNotesPage';
import { PLAYER_TABLET_MAX_DOMAINS, PLAYER_TABLET_PORTRAIT_ALLOWED_MIME_TYPES, PLAYER_TABLET_PORTRAIT_MAX_FILE_SIZE_BYTES } from '@/features/tablet/player/constants';
import type { TabletPlayerCharacterDraft, TabletPlayerDomain } from '@/features/tablet/player/types';
import type { StudioEntity } from '@/features/studio/api';
import type { StudioDraftExitActions } from '@/components/studio/StudioWorkspace';
import { createStudioCharacterDraft, createStudioDomain } from '@/features/studio/player/draft';
import { loadStudioCharacter, saveStudioCharacter } from '@/features/studio/player/api';
import type { StudioCharacterDraft } from '@/features/studio/player/types';
import type { PlayerStudioTab } from '@/features/studio/types';
import { createId } from '@/lib/createId';

type Props = {
  tab: PlayerStudioTab;
  entity: StudioEntity;
  onEntityChange: (patch: Partial<StudioEntity>) => void;
  registerDraftExitActions: (actions: StudioDraftExitActions | null) => void;
};

function id(prefix: string) { return `draft-${prefix}-${createId()}`; }

function toTabletDraft(draft: StudioCharacterDraft): TabletPlayerCharacterDraft {
  return { name: draft.name, description: draft.description, avatarUrl: draft.portraitPreviewUrl ?? draft.avatarUrl, portraitFile: draft.portraitFile, portraitPreviewUrl: draft.portraitPreviewUrl, attributes: draft.attributes, parameters: draft.parameters, domains: draft.domains };
}

export default function PlayerStudioContent({ tab, entity, onEntityChange, registerDraftExitActions }: Props) {
  const t = useTranslations('StudioEditor');
  const [draft, setDraft] = useState<StudioCharacterDraft>(() => createStudioCharacterDraft());
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsSuccess, setStatusIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!entity.isDraft);
  const [isDirty, setIsDirty] = useState(Boolean(entity.isDraft));

  useEffect(() => {
    let cancelled = false;
    if (entity.isDraft) return () => { cancelled = true; };
    void loadStudioCharacter(entity.id).then(({ character }) => {
      if (!cancelled) { setDraft(character); setIsDirty(false); }
    }).catch((error) => {
      if (!cancelled) { setStatusIsSuccess(false); setStatus(error instanceof Error ? error.message : t('loadCharacterError')); }
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [entity.id, entity.isDraft, t]);

  useEffect(() => () => { if (draft.portraitPreviewUrl) URL.revokeObjectURL(draft.portraitPreviewUrl); }, [draft.portraitPreviewUrl]);

  const update = (recipe: (current: StudioCharacterDraft) => StudioCharacterDraft) => { setDraft(recipe); setIsDirty(true); setStatus(null); setStatusIsSuccess(false); };
  const updateDomain = (domainId: string, recipe: (domain: TabletPlayerDomain) => TabletPlayerDomain) => update((current) => ({ ...current, domains: current.domains.map((domain) => domain.id === domainId ? recipe(domain) : domain) }));
  const validation = useMemo(() => {
    const missing: string[] = [];
    if (!draft.name.trim()) missing.push(t('validationName'));
    if (!draft.description.trim()) missing.push(t('validationDescription'));
    if (!draft.domains.length || draft.domains.some((domain) => !domain.name.trim() || domain.skills.some((skill) => !skill.name.trim()))) missing.push(t('validationDomains'));
    if (draft.inventoryItems.some((item) => !item.name.trim() || !item.description.trim())) missing.push(t('validationBackpack'));
    if (draft.experiences.some((item) => !item.headline.trim() || !item.description?.trim())) missing.push(t('validationLibrary'));
    if (draft.notes.some((note) => !note.title.trim() || !note.content.trim())) missing.push(t('validationNotes'));
    return missing;
  }, [draft, t]);

  const selectPortrait = (file: File | null) => {
    if (!file) return;
    if (!PLAYER_TABLET_PORTRAIT_ALLOWED_MIME_TYPES.includes(file.type) || file.size > PLAYER_TABLET_PORTRAIT_MAX_FILE_SIZE_BYTES) { setStatusIsSuccess(false); setStatus(t('portraitError')); return; }
    const preview = URL.createObjectURL(file);
    update((current) => { if (current.portraitPreviewUrl) URL.revokeObjectURL(current.portraitPreviewUrl); return { ...current, portraitFile: file, portraitPreviewUrl: preview }; });
  };

  const save = useCallback(async () => {
    if (!draft.name.trim() || !draft.description.trim() || isSaving || !isDirty) return false;
    setIsSaving(true); setStatus(null);
    try {
      const result = await saveStudioCharacter(draft, entity.isDraft ? undefined : entity.id);
      onEntityChange({ id: result.character.id, name: result.character.name, avatarUrl: result.character.avatar_url, isDraft: false });
      setIsDirty(false);
      setStatusIsSuccess(true);
      setStatus(entity.isDraft ? t('characterSaved') : t('characterChangesSaved'));
      return true;
    } catch (error) { setStatusIsSuccess(false); setStatus(error instanceof Error ? error.message : t('saveCharacterError')); }
    finally { setIsSaving(false); }
    return false;
  }, [draft, entity.id, entity.isDraft, isDirty, isSaving, onEntityChange, t]);

  const canSaveCore = Boolean(draft.name.trim() && draft.description.trim());

  useEffect(() => {
    if (!isDirty) {
      registerDraftExitActions(null);
      return;
    }
    registerDraftExitActions({ canSave: canSaveCore, save });
    return () => registerDraftExitActions(null);
  }, [canSaveCore, isDirty, registerDraftExitActions, save]);

  if (isLoading) return <div className="grid h-full place-items-center font-montserrat text-[13px] font-semibold text-white/45">{t('loadingCharacter')}</div>;
  if (status && !draft.name && !entity.isDraft) return <div className="grid h-full place-items-center text-center"><div><h2 className="font-montserrat-alt text-[26px] font-extrabold text-white">{t('loadCharacterError')}</h2><p className="mt-3 max-w-[520px] text-[13px] leading-relaxed text-red-200/70">{status}</p></div></div>;

  if (tab === 'character') return <StudioCharacterPage
    draft={toTabletDraft(draft)}
    status={status}
    onChange={(nextDraft) => update((current) => ({ ...current, ...nextDraft }))}
    onNameChange={(name) => { update((current) => ({ ...current, name })); if (entity.isDraft) onEntityChange({ name: name || t('newCharacter') }); }}
    onPortraitSelect={selectPortrait}
  />;

  if (tab === 'skills') return <TabletSkillsPage isEditable character={null} isLoading={false} error={null} isEditMode draft={toTabletDraft(draft)}
    onDomainAdd={() => { if (draft.domains.length >= PLAYER_TABLET_MAX_DOMAINS) return null; const domain = createStudioDomain(draft.domains.length); update((current) => ({ ...current, domains: [...current.domains, domain] })); return domain.id; }}
    onDomainDelete={(domainId) => { if (draft.domains.length > 1) update((current) => ({ ...current, domains: current.domains.filter((domain) => domain.id !== domainId).map((domain, index) => ({ ...domain, sortOrder: index })) })); }}
    onDomainNameChange={(domainId, name) => updateDomain(domainId, (domain) => ({ ...domain, name }))}
    onDomainIconChange={(domainId, iconKey) => updateDomain(domainId, (domain) => ({ ...domain, iconKey }))}
    onDomainLevelChange={(domainId, level) => updateDomain(domainId, (domain) => ({ ...domain, level, skills: domain.skills.map((skill) => skill.isPrimary ? { ...skill, level } : skill) }))}
    onDomainSkillAdd={(domainId) => { const skillId = id('skill'); updateDomain(domainId, (domain) => ({ ...domain, skills: [...domain.skills, { id: skillId, key: `${domain.key}-${createId()}`, name: t('skillName'), description: t('skillDescription'), iconKey: 'book', isPrimary: false, level: 1, sortOrder: domain.skills.length, metadata: { icon_key: 'book' }, isDraft: true }] })); return skillId; }}
    onDomainSkillDelete={(domainId, skillId) => updateDomain(domainId, (domain) => ({ ...domain, skills: domain.skills.filter((skill) => skill.id !== skillId || skill.isPrimary).map((skill, index) => ({ ...skill, sortOrder: index })) }))}
    onDomainSkillNameChange={(domainId, skillId, name) => updateDomain(domainId, (domain) => ({ ...domain, skills: domain.skills.map((skill) => skill.id === skillId ? { ...skill, name } : skill) }))}
    onDomainSkillIconChange={(domainId, skillId, iconKey) => updateDomain(domainId, (domain) => ({ ...domain, skills: domain.skills.map((skill) => skill.id === skillId ? { ...skill, iconKey, metadata: { ...skill.metadata, icon_key: iconKey } } : skill) }))}
    onDomainSkillDescriptionChange={(domainId, skillId, description) => updateDomain(domainId, (domain) => ({ ...domain, skills: domain.skills.map((skill) => skill.id === skillId ? { ...skill, description } : skill) }))}
    onDomainSkillLevelChange={(domainId, skillId, level) => updateDomain(domainId, (domain) => ({ ...domain, level: domain.skills.find((skill) => skill.id === skillId)?.isPrimary ? level : domain.level, skills: domain.skills.map((skill) => skill.id === skillId ? { ...skill, level } : skill) }))}
  />;

  if (tab === 'backpack') return <StudioBackpackPage items={draft.inventoryItems} />;

  if (tab === 'library') return <StudioLibraryPage experiences={draft.experiences} onChange={(experiences) => update((current) => ({ ...current, experiences }))} />;

  if (tab === 'notes') return <StudioNotesPage notes={draft.notes} draftId={entity.id} onChange={(notes) => update((current) => ({ ...current, notes }))} />;

  if (tab === 'relationships') return <StudioRelationshipsPage relationships={draft.relationships} />;

  const review = [
    [t('name'), draft.name || t('missing')],
    [t('description'), draft.description ? t('complete') : t('missing')],
    [t('domains'), String(draft.domains.length)],
    [t('backpackItems'), String(draft.inventoryItems.length)],
    [t('libraryEntries'), String(draft.experiences.length)],
    [t('privateNotes'), String(draft.notes.length)],
  ];

  return <div className="grid h-full grid-cols-[1fr_360px] gap-5 text-white"><section className="rounded-[18px] border border-white/10 bg-[#111927] p-6"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/35">{t('finalReview')}</p><h2 className="mt-2 font-montserrat-alt text-[28px] font-extrabold">{t('saveCharacter')}</h2><p className="mt-3 max-w-[620px] text-[13px] leading-relaxed text-white/50">{t('saveExplanation')}</p><div className="mt-6 grid grid-cols-2 gap-3">{review.map(([label, value]) => <div key={label} className="rounded-[12px] border border-white/10 bg-white/[.03] px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p><p className="mt-1 truncate font-montserrat-alt text-[15px] font-bold">{value}</p></div>)}</div></section><aside className="flex flex-col rounded-[18px] border border-white/15 p-5"><h3 className="font-montserrat-alt text-[20px] font-extrabold">{t('readyToSave')}</h3>{validation.length ? <div className="mt-4 rounded-[12px] border border-red-300/15 bg-red-400/5 p-4"><p className="text-[11px] font-bold text-red-200">{t('completeBeforeSaving')}</p><ul className="mt-2 list-inside list-disc text-[11px] leading-relaxed text-white/55">{validation.map((item) => <li key={item}>{item}</li>)}</ul></div> : <p className="mt-4 text-[12px] leading-relaxed text-white/50">{isDirty ? t('readyMessage') : t('noChanges')}</p>}<button type="button" onClick={() => void save()} disabled={Boolean(validation.length) || isSaving || !isDirty} className="mt-auto h-[52px] rounded-[12px] bg-white font-montserrat-alt text-[14px] font-extrabold text-[#172033] disabled:cursor-not-allowed disabled:opacity-30">{isSaving ? t('savingCharacter') : entity.isDraft ? t('saveCharacter') : t('saveChanges')}</button>{status ? <p className={`mt-3 text-center text-[11px] ${statusIsSuccess ? 'text-emerald-300' : 'text-red-300'}`}>{status}</p> : null}</aside></div>;
}
