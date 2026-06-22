'use client';

import { useSceneAudioVolume } from '@/features/tablet/useSceneAudioVolume';

import {
  Panel,
  SectionTitle,
} from './TabletPagePrimitives';

export default function TabletSettingsContent() {
  const { volume, setVolume } = useSceneAudioVolume();

  return (
    <div className="h-full">
      <SectionTitle title="Settings" subtitle="Scene audio preferences" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_360px] gap-[18px]">
        <Panel className="space-y-[18px]">
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
        </Panel>

        <Panel className="flex flex-col justify-between">
          <div className="space-y-[14px]">
            <div className="h-[20px] w-[180px] rounded-full bg-white/10" />
            <p className="font-montserrat text-[14px] leading-[1.5] text-white/65">
              This volume is local to your device and does not affect other players.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
