'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletScenePage() {
  return (
    <div className="h-full">
      <SectionTitle title="Scene" subtitle="Master scene control preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_360px] gap-[18px]">
        <Panel className="space-y-[14px]">
          <div className="h-[120px] rounded-[20px] bg-[#243047]" />
          <div className="h-[220px] rounded-[20px] bg-[#243047]" />
          <div className="h-[120px] rounded-[20px] bg-[#243047]" />
        </Panel>

        <Panel className="space-y-[14px]">
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[220px] rounded-[18px] bg-[#243047]" />
        </Panel>
      </div>
    </div>
  );
}