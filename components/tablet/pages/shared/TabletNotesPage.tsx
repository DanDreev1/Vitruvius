'use client';

import {
  Panel,
  SectionTitle,
} from './TabletPagePrimitives';

export default function TabletNotesPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Notes" subtitle="Later this page gets its own inner camera" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_340px] gap-[18px]">
        <Panel className="relative overflow-hidden">
          <div className="absolute left-[60px] top-[70px] h-[120px] w-[220px] rounded-[18px] bg-[#31415A]" />
          <div className="absolute left-[320px] top-[210px] h-[140px] w-[240px] rounded-[18px] bg-[#31415A]" />
          <div className="absolute left-[180px] top-[400px] h-[110px] w-[200px] rounded-[18px] bg-[#31415A]" />
        </Panel>

        <Panel className="space-y-[14px]">
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[240px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#D6B25E]" />
        </Panel>
      </div>
    </div>
  );
}