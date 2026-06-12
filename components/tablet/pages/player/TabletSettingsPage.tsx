'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletSettingsPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Settings" subtitle="Simple fixed layout preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_360px] gap-[18px]">
        <Panel className="space-y-[18px]">
          <div className="h-[72px] rounded-[20px] bg-[#243047]" />
          <div className="h-[72px] rounded-[20px] bg-[#243047]" />
          <div className="h-[72px] rounded-[20px] bg-[#243047]" />
        </Panel>

        <Panel className="flex flex-col justify-between">
          <div className="space-y-[14px]">
            <div className="h-[20px] w-[180px] rounded-full bg-white/10" />
            <div className="h-[16px] w-full rounded-full bg-white/5" />
            <div className="h-[16px] w-[82%] rounded-full bg-white/5" />
          </div>

          <div className="h-[62px] rounded-[18px] bg-[#7A1E1E]" />
        </Panel>
      </div>
    </div>
  );
}