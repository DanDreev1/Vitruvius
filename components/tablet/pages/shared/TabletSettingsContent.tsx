'use client';

import { useEffect, useRef, useState } from 'react';

import {
  LOBBY_AVATAR_ALLOWED_MIME_TYPES,
  LOBBY_AVATAR_MAX_FILE_SIZE_BYTES,
  LOBBY_AVATAR_UPDATE_COOLDOWN_MS,
} from '@/features/lobby/constants';
import {
  isPartyConfirmationSuppressed,
  setPartyConfirmationSuppressed,
} from '@/features/tablet/master/party/confirmation';
import {
  saveParticipantProfileAvatar,
  saveParticipantProfileNickname,
} from '@/features/tablet/settings/profile';
import type { TabletParticipant } from '@/features/tablet/types';
import { useSceneAudioVolume } from '@/features/tablet/useSceneAudioVolume';
import { useSessionExit } from '@/features/session-exit/SessionExitProvider';
import {
  loadInGameWorldProfile,
  saveInGameWorldAvatar,
  saveInGameWorldName,
} from '@/features/tablet/settings/worldProfile';

import {
  Panel,
  SectionTitle,
} from './TabletPagePrimitives';

type TabletSettingsContentProps = {
  sessionId: string;
  participant: TabletParticipant | null;
  viewerUserId: string;
  inGameWorldId?: string | null;
};

export default function TabletSettingsContent({
  sessionId,
  participant,
  viewerUserId,
  inGameWorldId = null,
}: TabletSettingsContentProps) {
  const { volume, setVolume } = useSceneAudioVolume();
  const { requestExit, isBusy: isExitingSession } = useSessionExit();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const worldAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [nickname, setNickname] = useState(participant?.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(participant?.avatar_url ?? null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatarCooldownEndsAt, setAvatarCooldownEndsAt] = useState<number | null>(null);
  const [arePartyConfirmationsSuppressed, setArePartyConfirmationsSuppressed] =
    useState(() => isPartyConfirmationSuppressed());
  const [worldName, setWorldName] = useState('');
  const [savedWorldName, setSavedWorldName] = useState('');
  const [worldAvatarUrl, setWorldAvatarUrl] = useState<string | null>(null);
  const [isSavingWorld, setIsSavingWorld] = useState(false);

  useEffect(() => {
    if (!inGameWorldId) return;
    let isActive = true;

    void loadInGameWorldProfile(inGameWorldId)
      .then((profile) => {
        if (!isActive) return;
        setWorldName(profile.name);
        setSavedWorldName(profile.name);
        setWorldAvatarUrl(profile.avatarUrl);
      })
      .catch((error) => {
        if (isActive) setProfileError(error instanceof Error ? error.message : 'Could not load world.');
      });

    return () => { isActive = false; };
  }, [inGameWorldId]);

  useEffect(() => {
    if (!profileMessage) return;

    const timeoutId = window.setTimeout(() => setProfileMessage(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [profileMessage]);

  const trimmedNickname = nickname.trim();
  const canSaveNickname = Boolean(
    participant &&
    trimmedNickname &&
    trimmedNickname !== (participant.display_name ?? '').trim() &&
    !isSavingNickname
  );

  const saveNickname = async () => {
    if (!participant || !canSaveNickname) return;
    setIsSavingNickname(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      await saveParticipantProfileNickname({
        sessionId,
        participantId: participant.id,
        displayName: trimmedNickname,
      });
      setIsEditingNickname(false);
      setProfileMessage('Nickname changed successfully.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save nickname.');
    } finally {
      setIsSavingNickname(false);
    }
  };

  const selectAvatar = async (file: File | null) => {
    if (!file || !participant || isUploadingAvatar) return;

    if (avatarCooldownEndsAt && avatarCooldownEndsAt > Date.now()) {
      setProfileError('Avatar can be changed again in a few minutes.');
      return;
    }

    if (!LOBBY_AVATAR_ALLOWED_MIME_TYPES.includes(file.type)) {
      setProfileError('Only JPG, PNG, WEBP, or GIF images are allowed.');
      return;
    }

    if (file.size > LOBBY_AVATAR_MAX_FILE_SIZE_BYTES) {
      setProfileError('Avatar must be 5 MB or smaller.');
      return;
    }

    setIsUploadingAvatar(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const nextAvatarUrl = await saveParticipantProfileAvatar({
        sessionId,
        participantId: participant.id,
        userId: viewerUserId,
        file,
      });
      setAvatarUrl(nextAvatarUrl);
      setAvatarCooldownEndsAt(Date.now() + LOBBY_AVATAR_UPDATE_COOLDOWN_MS);
      setProfileMessage('Avatar changed successfully.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const restorePartyConfirmations = () => {
    setPartyConfirmationSuppressed(false);
    setArePartyConfirmationsSuppressed(false);
  };

  const saveWorldName = async () => {
    const nextName = worldName.trim();
    if (!inGameWorldId || !nextName || nextName === savedWorldName || isSavingWorld) return;
    setIsSavingWorld(true);
    setProfileError(null);
    try {
      await saveInGameWorldName(inGameWorldId, nextName);
      setWorldName(nextName);
      setSavedWorldName(nextName);
      setProfileMessage('World name saved.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save world name.');
    } finally {
      setIsSavingWorld(false);
    }
  };

  const selectWorldAvatar = async (file: File | null) => {
    if (!file || !inGameWorldId || isSavingWorld) return;
    if (!LOBBY_AVATAR_ALLOWED_MIME_TYPES.includes(file.type)) {
      setProfileError('Only JPG, PNG, WEBP, or GIF images are allowed.');
      return;
    }
    if (file.size > LOBBY_AVATAR_MAX_FILE_SIZE_BYTES) {
      setProfileError('World image must be 5 MB or smaller.');
      return;
    }

    setIsSavingWorld(true);
    setProfileError(null);
    try {
      const nextUrl = await saveInGameWorldAvatar({ sessionId, worldId: inGameWorldId, file });
      setWorldAvatarUrl(nextUrl);
      setProfileMessage('World image saved.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not upload world image.');
    } finally {
      setIsSavingWorld(false);
    }
  };

  const copyNickname = async () => {
    const value = (participant?.display_name ?? nickname).trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setProfileError(null);
      setProfileMessage('Nickname copied.');
    } catch {
      setProfileError('Could not copy nickname.');
    }
  };

  return (
    <div className="relative h-full">
      {profileMessage ? (
        <div className="pointer-events-none absolute left-1/2 top-[4px] z-40 -translate-x-1/2 rounded-full border border-emerald-300/35 bg-black/80 px-[18px] py-[8px] font-montserrat text-[12px] font-extrabold text-emerald-300 shadow-lg">
          {profileMessage}
        </div>
      ) : null}

      <SectionTitle title="Settings" subtitle="Profile and local preferences" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_360px] gap-[18px] pb-[14px]">
        <Panel className="space-y-[18px] overflow-y-auto">
          {participant?.role === 'master' && inGameWorldId ? (
            <div className="rounded-[24px] border-[2px] border-[#D6B25E]/60 bg-transparent px-[22px] py-[16px]">
              <div className="flex items-center gap-[18px]">
                <button
                  type="button"
                  onClick={() => worldAvatarInputRef.current?.click()}
                  disabled={isSavingWorld}
                  className="h-[74px] w-[74px] shrink-0 rounded-[18px] border border-white/20 bg-[#111A2D] bg-cover bg-center transition hover:border-[#D6B25E] disabled:opacity-50"
                  style={worldAvatarUrl ? { backgroundImage: `url(${worldAvatarUrl})` } : undefined}
                  aria-label="Change world image"
                />
                <input
                  ref={worldAvatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) => {
                    void selectWorldAvatar(event.currentTarget.files?.[0] ?? null);
                    event.currentTarget.value = '';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="mb-[8px] font-montserrat-alt text-[18px] font-extrabold text-white">World profile</p>
                  <div className="flex gap-[8px]">
                    <input
                      value={worldName}
                      maxLength={80}
                      disabled={isSavingWorld}
                      onChange={(event) => setWorldName(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') void saveWorldName(); }}
                      className="h-[42px] min-w-0 flex-1 rounded-full border border-white/25 bg-[#111A2D] px-[16px] font-montserrat text-[13px] font-bold text-white outline-none focus:border-[#D6B25E]"
                      placeholder="World name"
                    />
                    <button
                      type="button"
                      onClick={() => void saveWorldName()}
                      disabled={!worldName.trim() || worldName.trim() === savedWorldName || isSavingWorld}
                      className="rounded-full bg-white px-[18px] font-montserrat text-[12px] font-extrabold text-black disabled:opacity-35"
                    >
                      {isSavingWorld ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <p className="mt-[7px] font-montserrat text-[11px] text-white/55">Click the image to replace it.</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[24px] border-[2px] border-white/80 bg-transparent px-[22px] py-[16px]">
            <div className="flex min-h-[74px] items-center gap-[20px]">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={!participant || isUploadingAvatar}
                  className="group relative block h-[64px] w-[64px] rounded-full border border-white/15 bg-[#898989] bg-cover bg-center transition hover:border-[#D6B25E] disabled:cursor-not-allowed disabled:opacity-50"
                  style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
                  aria-label="Change avatar"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={!participant || isUploadingAvatar}
                  className="absolute -bottom-[3px] -right-[3px] flex h-[25px] w-[25px] items-center justify-center rounded-full border-[2px] border-[#172033] bg-white shadow-md transition hover:scale-105 disabled:opacity-50"
                  aria-label="Change avatar"
                  title={isUploadingAvatar ? 'Uploading avatar' : 'Change avatar'}
                >
                  <span
                    className="h-[13px] w-[13px] bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/PaintBrush.png')" }}
                  />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) => {
                    void selectAvatar(event.currentTarget.files?.[0] ?? null);
                    event.currentTarget.value = '';
                  }}
                />
              </div>

              <div className="min-w-[180px] flex-1">
                <p className="truncate font-montserrat-alt text-[23px] font-extrabold leading-none text-white">
                  {participant?.display_name?.trim() || nickname.trim() || 'Nickname'}
                </p>
                <p className="mt-[6px] font-montserrat text-[17px] leading-none text-white">
                  Role: {participant?.role === 'master' ? 'Master' : 'Player'}
                </p>
              </div>

              {isEditingNickname ? (
                <div className="flex min-w-0 flex-[1.4] items-center gap-[8px]">
                  <input
                    value={nickname}
                    maxLength={36}
                    disabled={!participant || isSavingNickname}
                    onChange={(event) => {
                      setNickname(event.target.value);
                      setProfileError(null);
                      setProfileMessage(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveNickname();
                    }}
                    autoFocus
                    className="h-[42px] min-w-0 flex-1 rounded-full border border-white/25 bg-[#111A2D] px-[16px] font-montserrat text-[13px] font-bold text-white outline-none focus:border-[#D6B25E] disabled:opacity-50"
                    placeholder="Nickname"
                    aria-label="Nickname"
                  />
                  <button
                    type="button"
                    onClick={() => void saveNickname()}
                    disabled={!canSaveNickname}
                    className="h-[42px] rounded-full bg-white px-[17px] font-montserrat text-[12px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {isSavingNickname ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNickname(participant?.display_name ?? '');
                      setIsEditingNickname(false);
                      setProfileError(null);
                    }}
                    disabled={isSavingNickname}
                    className="h-[42px] rounded-full border border-white/30 px-[15px] font-montserrat text-[12px] font-extrabold text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-[10px]">
                  <button
                    type="button"
                    onClick={() => void copyNickname()}
                    disabled={!participant}
                    className="h-[42px] min-w-[150px] rounded-full bg-white px-[20px] font-montserrat text-[12px] font-extrabold text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    Copy nickname
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNickname(participant?.display_name ?? '');
                      setIsEditingNickname(true);
                      setProfileError(null);
                      setProfileMessage(null);
                    }}
                    disabled={!participant}
                    className="h-[42px] min-w-[150px] rounded-full bg-white px-[20px] font-montserrat text-[12px] font-extrabold text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    Change nickname
                  </button>
                </div>
              )}
            </div>

            {(profileError || isUploadingAvatar) ? (
              <p className={`mt-[8px] text-right font-montserrat text-[11px] font-semibold ${profileError ? 'text-red-300' : 'text-[#D6B25E]'}`}>
                {profileError ?? 'Uploading avatar...'}
              </p>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#243047] px-[20px] py-[18px]">
            <div className="mb-[14px] flex items-center justify-between gap-[16px]">
              <div>
                <p className="font-montserrat-alt text-[20px] font-extrabold text-white">
                  Scene audio
                </p>
                <p className="mt-[4px] font-montserrat text-[14px] text-white/65">
                  Music volume
                </p>
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
              aria-label="Scene audio volume"
            />
          </div>

          <div className="rounded-[20px] border border-white/10 bg-[#243047] px-[20px] py-[18px]">
            <div className="mb-[14px] flex items-center justify-between gap-[16px]">
              <div>
                <p className="font-montserrat-alt text-[20px] font-extrabold text-white">
                  Party confirmations
                </p>
                <p className="mt-[4px] font-montserrat text-[14px] text-white/65">
                  Confirmation popups for check decisions
                </p>
              </div>

              <button
                type="button"
                onClick={restorePartyConfirmations}
                disabled={!arePartyConfirmationsSuppressed}
                className="rounded-[14px] bg-white px-[16px] py-[9px] font-montserrat text-[13px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Restore
              </button>
            </div>

            <p className="font-montserrat text-[14px] leading-[1.5] text-white/65">
              {arePartyConfirmationsSuppressed
                ? 'Party decision confirmations are hidden for this browser.'
                : 'Party decision confirmations are currently enabled.'}
            </p>
          </div>
        </Panel>

        <Panel className="flex flex-col justify-between">
          <div className="space-y-[14px]">
            <div className="h-[20px] w-[180px] rounded-full bg-white/10" />
            <p className="font-montserrat text-[14px] leading-[1.5] text-white/65">
              This volume is local to your device and does not affect other players.
            </p>
          </div>
          <div className="rounded-[20px] border border-[#E07373]/25 bg-[#E07373]/5 p-[18px]">
            <p className="font-montserrat-alt text-[18px] font-extrabold text-white">
              {participant?.role === 'master' ? 'End session' : 'Exit the game'}
            </p>
            <p className="mt-[6px] font-montserrat text-[12px] leading-relaxed text-white/55">
              {participant?.role === 'master'
                ? 'Close the room for everyone and choose what to do with the world.'
                : 'Leave the table and choose what to do with your character.'}
            </p>
            <button
              type="button"
              disabled={!participant || isExitingSession}
              onClick={() => {
                if (participant) requestExit(sessionId, participant.role);
              }}
              className="mt-[14px] w-full rounded-[14px] border border-[#E07373]/40 px-[16px] py-[11px] font-montserrat text-[13px] font-extrabold text-[#E88A8A] transition hover:bg-[#E07373]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {participant?.role === 'master' ? 'End session' : 'Exit the game'}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
