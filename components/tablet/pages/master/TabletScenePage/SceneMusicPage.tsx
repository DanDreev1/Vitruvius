'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { SceneAudienceState, SceneMusicItem } from '@/features/tablet/master/scene/types';
import {
  getSceneMusicRuntimeState,
  getSceneMusicRuntimeTime,
} from '@/features/tablet/master/scene/musicRuntime';
import { useSceneMusic } from '@/features/tablet/master/scene/useSceneMusic';
import { useSceneMusicEndMode } from '@/features/tablet/master/scene/useSceneMusicEndMode';
import { useSceneMusicTargets } from '@/features/tablet/master/scene/useSceneMusicTargets';

type SceneMusicPageProps = {
  sessionId: string;
  inGameWorldId: string | null;
  onAudienceStateChange: (state: SceneAudienceState | null) => void;
};

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        d={direction === 'left' ? 'M15 6 9 12l6 6' : 'm9 6 6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[16px] w-[16px]">
      <path
        d="M4 9v6h4l5 4V5L8 9H4Z"
        fill="currentColor"
      />
      <path
        d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function SceneMusicPage({
  sessionId,
  inGameWorldId,
  onAudienceStateChange,
}: SceneMusicPageProps) {
  const t = useTranslations('TabletMaster.scene.music');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const coverTargetRef = useRef<SceneMusicItem | null>(null);
  const metadataAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSeekCommitRef = useRef<{ value: number; committedAt: number } | null>(null);
  const metadataTrackRef = useRef<{ id: string; audioUrl: string | null } | null>(null);
  const volumeCommitTimeoutRef = useRef<number | null>(null);
  const [activeDuration, setActiveDuration] = useState(0);
  const [activeDisplayTime, setActiveDisplayTime] = useState(0);
  const [globalVolumeDraft, setGlobalVolumeDraft] = useState(1);
  const {
    music,
    isLoading,
    isUploading,
    error,
    uploadMusic,
    uploadCover,
    setMusicVolume,
    selectMusic,
    playMusic,
    pauseMusic,
    seekMusic,
    switchMusic,
    deleteMusic,
  } = useSceneMusic(inGameWorldId, sessionId);
  const { mode: endMode, toggleMode: toggleEndMode } = useSceneMusicEndMode();

  const sortedMusic = useMemo(
    () => [...music].sort((a, b) => a.sortOrder - b.sortOrder),
    [music]
  );
  const activeMusic = sortedMusic.find((item) => item.isActive) ?? null;
  const activeMusicIndex = activeMusic
    ? sortedMusic.findIndex((item) => item.id === activeMusic.id)
    : -1;
  const canSwitchMusic = sortedMusic.length > 1 && activeMusicIndex >= 0;

  useEffect(() => {
    const nextTrack = activeMusic
      ? { id: activeMusic.id, audioUrl: activeMusic.audioUrl }
      : null;
    const previousTrack = metadataTrackRef.current;
    const isSameTrack =
      previousTrack?.id === nextTrack?.id &&
      previousTrack?.audioUrl === nextTrack?.audioUrl;

    if (isSameTrack) {
      return;
    }

    metadataTrackRef.current = nextTrack;

    const timeoutId = window.setTimeout(() => {
      setActiveDuration(0);
      setActiveDisplayTime(activeMusic?.currentTimeSeconds ?? 0);
    }, 0);

    if (!activeMusic) {
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const audio = metadataAudioRef.current;
    if (!audio) {
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    audio.src = activeMusic.audioUrl;
    audio.load();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeMusic]);

  useEffect(() => {
    if (!activeMusic) return;

    const updateDisplayTime = () => {
      const runtimeState = getSceneMusicRuntimeState(sessionId, activeMusic);
      setActiveDisplayTime(
        runtimeState
          ? getSceneMusicRuntimeTime(runtimeState)
          : activeMusic.currentTimeSeconds
      );
    };

    updateDisplayTime();

    if (!activeMusic.isPlaying) return;

    const intervalId = window.setInterval(updateDisplayTime, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeMusic, sessionId]);

  const {
    audience,
    selectedCharacterIds,
    error: targetsError,
    toggleParticipant,
    toggleAll,
  } = useSceneMusicTargets(sessionId, activeMusic?.id ?? null, !activeMusic);

  useEffect(() => {
    onAudienceStateChange({
      participants: audience,
      selectedCharacterIds,
      disabled: !activeMusic,
      onToggleAll: toggleAll,
      onToggleParticipant: toggleParticipant,
    });

    return () => {
      onAudienceStateChange(null);
    };
  }, [
    activeMusic,
    audience,
    onAudienceStateChange,
    selectedCharacterIds,
    toggleAll,
    toggleParticipant,
  ]);

  const displayError = error ?? targetsError;

  const handleAddMusic = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadMusic(file);
    } finally {
      event.target.value = '';
    }
  };

  const handleCoverClick = (item: SceneMusicItem) => {
    coverTargetRef.current = item;
    coverInputRef.current?.click();
  };

  const handleCoverFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    const target = coverTargetRef.current;
    if (!file || !target) return;

    try {
      await uploadCover(target, file);
    } finally {
      event.target.value = '';
      coverTargetRef.current = null;
    }
  };

  const handleTrackSelect = (item: SceneMusicItem) => {
    if (item.isActive) return;
    void selectMusic(item.id);
  };

  const handlePlayClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    item: SceneMusicItem
  ) => {
    event.stopPropagation();

    if (item.isActive && item.isPlaying) {
      void pauseMusic(item);
      return;
    }

    void playMusic(item);
  };

  const handleSwitchMusic = (direction: -1 | 1) => {
    if (!activeMusic || !canSwitchMusic) return;

    const nextIndex =
      (activeMusicIndex + direction + sortedMusic.length) % sortedMusic.length;
    const nextMusic = sortedMusic[nextIndex];
    if (!nextMusic) return;

    void switchMusic(nextMusic, activeMusic.isPlaying);
  };

  const handleDeleteClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    item: SceneMusicItem
  ) => {
    event.stopPropagation();
    void deleteMusic(item);
  };

  const handleSeekChange: React.ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    setActiveDisplayTime(Number(event.target.value));
  };

  const handleSeekCommit = (value: number) => {
    if (!activeMusic) return;

    const lastCommit = lastSeekCommitRef.current;
    const now = Date.now();

    if (
      lastCommit &&
      Math.abs(lastCommit.value - value) < 0.05 &&
      now - lastCommit.committedAt < 250
    ) {
      return;
    }

    lastSeekCommitRef.current = {
      value,
      committedAt: now,
    };

    void seekMusic(activeMusic, value);
  };

  const activeProgressMax = activeDuration || Math.max(activeDisplayTime, 1);

  useEffect(() => {
    setGlobalVolumeDraft(activeMusic?.volume ?? 1);
  }, [activeMusic?.id, activeMusic?.volume]);

  useEffect(() => {
    return () => {
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
      }
    };
  }, []);

  const handleGlobalVolumeChange = (value: number) => {
    if (!activeMusic) return;

    const safeVolume = Math.min(1, Math.max(0, value));
    setGlobalVolumeDraft(safeVolume);

    if (volumeCommitTimeoutRef.current !== null) {
      window.clearTimeout(volumeCommitTimeoutRef.current);
    }

    volumeCommitTimeoutRef.current = window.setTimeout(() => {
      void setMusicVolume(activeMusic, safeVolume);
    }, 180);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <audio
        ref={metadataAudioRef}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;
          setActiveDuration(Number.isFinite(duration) ? duration : 0);
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/mp4"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        onChange={handleCoverFileChange}
        className="hidden"
      />

      <div className="mb-[18px] flex items-center gap-[12px]">
        <div>
          <h2 className="font-montserrat-alt text-[34px] font-extrabold text-white">
            {t('playlist')}
          </h2>
          <p className="mt-[4px] font-montserrat text-[14px] text-white/65">
            {activeMusic ? t('selectedTrack', { title: activeMusic.title }) : t('noSelectedTrack')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddMusic}
          disabled={isUploading}
          className="ml-auto rounded-[14px] bg-white px-[22px] py-[11px] font-montserrat text-[15px] font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? t('uploading') : t('addMusic')}
        </button>
      </div>

      {displayError ? (
        <div className="mb-[12px] rounded-[16px] border border-red-400/30 bg-red-500/10 px-[14px] py-[10px] font-montserrat text-[14px] text-red-200">
          {displayError}
        </div>
      ) : null}

      {activeMusic ? (
        <div className="mb-[12px] rounded-[22px] border border-white/15 bg-[#0B1327] px-[16px] py-[14px]">
          <div className="mb-[12px] flex items-center gap-[12px]">
            <button
              type="button"
              onClick={() => handleCoverClick(activeMusic)}
              disabled={isUploading}
              className="group relative h-[74px] w-[104px] shrink-0 overflow-hidden rounded-[16px] border border-white/15 bg-[#111A2D] bg-cover bg-center transition hover:border-white/45 disabled:cursor-not-allowed disabled:opacity-60"
              style={
                activeMusic.coverUrl
                  ? { backgroundImage: `url(${activeMusic.coverUrl})` }
                  : undefined
              }
            >
              <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/45" />
              <span className="absolute inset-x-[8px] bottom-[8px] rounded-[8px] bg-black/70 px-[8px] py-[5px] text-center font-montserrat text-[9px] font-extrabold text-white">
                {activeMusic.coverUrl ? t('replaceCover') : t('addCover')}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                {activeMusic.title}
              </p>
              <div className="mt-[7px] flex max-w-[360px] items-center gap-[10px]">
                <p className="shrink-0 font-montserrat text-[12px] font-semibold text-white/55">
                  {activeMusic.isPlaying ? t('playing') : t('paused')}
                </p>
                <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-white/25" />
                <div className="flex min-w-[170px] flex-1 items-center gap-[8px] rounded-full border border-white/10 bg-white/[0.04] px-[10px] py-[6px] text-white/75">
                  <VolumeIcon />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(globalVolumeDraft * 100)}
                    onChange={(event) =>
                      handleGlobalVolumeChange(Number(event.target.value) / 100)
                    }
                    className="h-[4px] min-w-0 flex-1 cursor-pointer accent-white"
                    aria-label={t('globalVolume')}
                  />
                  <span className="w-[34px] text-right font-montserrat text-[10px] font-extrabold text-white/60">
                    {Math.round(globalVolumeDraft * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-[8px]">
              <button
                type="button"
                onClick={() => handleSwitchMusic(-1)}
                disabled={!canSwitchMusic}
                className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white/15 text-white transition disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={t('previousTrack')}
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={(event) => handlePlayClick(event, activeMusic)}
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-black"
                aria-label={activeMusic.isPlaying ? t('pause') : t('play')}
              >
                {activeMusic.isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMusic(1)}
                disabled={!canSwitchMusic}
                className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white/15 text-white transition disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={t('nextTrack')}
              >
                <ChevronIcon direction="right" />
              </button>
              <button
                type="button"
                onClick={toggleEndMode}
                className={[
                  'relative flex h-[40px] w-[40px] items-center justify-center rounded-full transition',
                  endMode === 'repeat'
                    ? 'bg-[#D6B25E] text-black'
                    : 'bg-white/15 text-white',
                ].join(' ')}
                aria-label={endMode === 'repeat' ? t('repeatTrack') : t('autoNextTrack')}
              >
                <RepeatIcon />
                {endMode === 'repeat' ? (
                  <span className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
                ) : null}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-[12px]">
            <span className="w-[44px] font-montserrat text-[12px] font-bold text-white/75">
              {formatTime(activeDisplayTime)}
            </span>
            <input
              type="range"
              min={0}
              max={activeProgressMax}
              step={0.1}
              value={Math.min(activeDisplayTime, activeProgressMax)}
              onChange={handleSeekChange}
              onClick={(event) => {
                handleSeekCommit(Number(event.currentTarget.value));
              }}
              onPointerUp={(event) => {
                handleSeekCommit(Number(event.currentTarget.value));
              }}
              onMouseUp={(event) => {
                handleSeekCommit(Number(event.currentTarget.value));
              }}
              onTouchEnd={(event) => {
                handleSeekCommit(Number(event.currentTarget.value));
              }}
              onKeyUp={(event) => {
                handleSeekCommit(Number(event.currentTarget.value));
              }}
              className="h-[6px] flex-1 cursor-pointer accent-white"
              aria-label={t('sceneMusicTime')}
            />
            <span className="w-[44px] text-right font-montserrat text-[12px] font-bold text-white/75">
              {activeDuration ? formatTime(activeDuration) : '--:--'}
            </span>
          </div>

        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.02] p-[14px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-[24px] bg-[#0B1327]">
            <p className="font-montserrat text-[16px] text-white/75">
              {t('loading')}
            </p>
          </div>
        ) : !sortedMusic.length ? (
          <div className="flex h-full items-center justify-center rounded-[24px] bg-[#0B1327]">
            <p className="font-montserrat text-[16px] text-white/75">
              {t('empty')}
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-[12px] overflow-y-auto pr-[4px]">
            {sortedMusic.map((item) => {
              const itemDisplayTime = item.id === activeMusic?.id
                ? activeDisplayTime
                : item.currentTimeSeconds;
              const progressPercent = item.isActive
                ? Math.min(
                    100,
                    Math.max(0, (itemDisplayTime / activeProgressMax) * 100)
                  )
                : 0;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTrackSelect(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleTrackSelect(item);
                    }
                  }}
                  className={[
                    'cursor-pointer',
                    'rounded-[22px] border px-[16px] py-[14px] text-left transition-colors',
                    item.isActive
                      ? 'border-white bg-white/10'
                      : 'border-white/35 bg-transparent hover:bg-white/5',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-[16px]">
                    <div
                      className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-white/90 bg-cover bg-center font-montserrat-alt text-[20px] font-extrabold text-black"
                      style={
                        item.coverUrl
                          ? { backgroundImage: `url(${item.coverUrl})` }
                          : undefined
                      }
                    >
                      {item.coverUrl ? null : item.title.trim().charAt(0).toUpperCase() || 'M'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-[10px]">
                        <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                          {item.title}
                        </p>
                        {item.isActive ? (
                          <span className="shrink-0 rounded-full bg-[#D6B25E] px-[10px] py-[4px] font-montserrat text-[11px] font-bold text-black">
                            {t('selected')}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-[12px] flex items-center gap-[12px]">
                        <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/15">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="w-[48px] text-right font-montserrat text-[12px] text-white/75">
                          {formatTime(itemDisplayTime)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-[8px]">
                      <button
                        type="button"
                        onClick={(event) => handlePlayClick(event, item)}
                        className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-black"
                        aria-label={item.isActive && item.isPlaying ? t('pause') : t('play')}
                      >
                        {item.isActive && item.isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDeleteClick(event, item)}
                        className="rounded-full bg-white/15 px-[14px] py-[8px] font-montserrat text-[13px] font-bold text-white"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
