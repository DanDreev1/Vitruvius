'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Panel, SectionTitle } from '@/components/tablet/pages/shared/TabletPagePrimitives';
import type { StudioWorldData } from '@/features/studio/master/types';
import { useSceneAudioVolume } from '@/features/tablet/useSceneAudioVolume';

type Props = {
  worldId: string;
  data: StudioWorldData;
  setError: (message: string | null) => void;
  updateWorldDraft: (patch: { name?: string; avatar_url?: string | null }) => void;
  uploadFile: (worldId: string, kind: 'avatar', file: File) => Promise<{ value: string; displayUrl: string | null; path: string }>;
  saveDraft: () => Promise<boolean>;
  isDirty: boolean;
  isSavingDraft: boolean;
};

export default function StudioSettingsEditor({
  worldId,
  data,
  setError,
  updateWorldDraft,
  uploadFile,
  saveDraft,
  isDirty,
  isSavingDraft,
}: Props) {
  const t = useTranslations('StudioMaster');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(data.world.name);
  const [avatarPreview, setAvatarPreview] = useState(data.world.avatar_url);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { volume, setVolume } = useSceneAudioVolume();

  async function selectImage(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadFile(worldId, 'avatar', file);
      setAvatarPreview(uploaded.displayUrl ?? uploaded.value);
      updateWorldDraft({ avatar_url: uploaded.value });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not upload world image.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    setMessage(null);
    if (await saveDraft()) setMessage(t('worldChangesSaved'));
  }

  return (
    <div className="relative h-full">
      {message ? (
        <div className="pointer-events-none absolute left-1/2 top-[4px] z-40 -translate-x-1/2 rounded-full border border-emerald-300/35 bg-black/80 px-[18px] py-[8px] font-montserrat text-[12px] font-extrabold text-emerald-300 shadow-lg">
          {message}
        </div>
      ) : null}

      <SectionTitle title={t('settings')} subtitle={t('settingsSubtitle')} />

      <div className="grid h-[calc(100%-72px)] grid-cols-[minmax(0,1fr)_360px] gap-[18px] pb-[14px]">
        <Panel className="space-y-[18px] overflow-y-auto">
          <div className="rounded-[24px] border-[2px] border-[#D6B25E]/60 bg-transparent px-[22px] py-[18px]">
            <div className="flex items-center gap-[18px]">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={busy}
                className="h-[92px] w-[92px] shrink-0 rounded-[20px] border border-white/20 bg-[#111A2D] bg-cover bg-center transition hover:border-[#D6B25E] disabled:opacity-50"
                style={avatarPreview ? { backgroundImage: `url(${avatarPreview})` } : undefined}
                aria-label={t('changeWorldImage')}
              >
                {!avatarPreview ? <span className="text-[28px] font-bold text-white/20">W</span> : null}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  void selectImage(event.currentTarget.files?.[0] ?? null);
                  event.currentTarget.value = '';
                }}
              />

              <div className="min-w-0 flex-1">
                <p className="font-montserrat-alt text-[20px] font-extrabold text-white">{t('worldProfile')}</p>
                <p className="mt-[5px] font-montserrat text-[12px] text-white/55">{t('replaceImageHelp')}</p>
                <div className="mt-[13px] flex gap-[8px]">
                  <input
                    value={name}
                    maxLength={100}
                    disabled={busy}
                    onChange={(event) => {
                      setName(event.target.value);
                      updateWorldDraft({ name: event.target.value });
                      setMessage(null);
                    }}
                    className="h-[44px] min-w-0 flex-1 rounded-full border border-white/25 bg-[#111A2D] px-[16px] font-montserrat text-[13px] font-bold text-white outline-none focus:border-[#D6B25E]"
                    placeholder={t('worldName')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#243047] px-[20px] py-[18px]">
            <div className="mb-[14px] flex items-center justify-between gap-[16px]">
              <div>
                <p className="font-montserrat-alt text-[20px] font-extrabold text-white">{t('sceneAudio')}</p>
                <p className="mt-[4px] font-montserrat text-[14px] text-white/65">{t('musicVolume')}</p>
              </div>
              <span className="font-montserrat-alt text-[24px] font-extrabold text-[#D6B25E]">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
              className="h-[8px] w-full accent-[#D6B25E]"
              aria-label={t('sceneAudioVolume')}
            />
            <div className="mt-[9px] flex justify-between font-montserrat text-[10px] font-semibold uppercase tracking-[.12em] text-white/30">
              <span>{t('muted')}</span><span>{t('fullVolume')}</span>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col justify-between">
          <div>
            <p className="font-montserrat-alt text-[20px] font-extrabold text-white">{t('localPreferences')}</p>
            <p className="mt-[9px] font-montserrat text-[14px] leading-[1.55] text-white/65">
              {t('localAudioHelp')}
            </p>
          </div>

          <div className="space-y-[12px]">
            <button type="button" onClick={() => void handleSaveDraft()} disabled={!isDirty || isSavingDraft || !name.trim()} className="h-[52px] w-full rounded-[16px] bg-white font-montserrat-alt text-[14px] font-extrabold text-[#172033] disabled:cursor-not-allowed disabled:opacity-30">
              {isSavingDraft ? t('saving') : t('saveWorldChanges')}
            </button>
            <div className="rounded-[20px] border border-white/10 bg-[#243047] p-[18px]">
              <p className="font-montserrat text-[10px] font-bold uppercase tracking-[.16em] text-white/35">{t('permanentData')}</p>
              <p className="mt-[7px] font-montserrat text-[13px] leading-[1.5] text-white/65">
                {t('permanentHelp')}
              </p>
            </div>
            <div className="rounded-[20px] border border-[#D6B25E]/20 bg-[#D6B25E]/5 p-[18px]">
              <p className="font-montserrat-alt text-[17px] font-extrabold text-white">{t('studioMode')}</p>
              <p className="mt-[6px] font-montserrat text-[12px] leading-relaxed text-white/55">
                {t('studioModeHelp')}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
