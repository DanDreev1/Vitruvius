'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletRelationshipPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Relationship" subtitle="Large character card preview" />

      <Panel className="flex h-[calc(100%-72px)] items-center justify-center">
        <div className="grid w-full max-w-[900px] grid-cols-[260px_1fr] gap-[20px]">
          <div className="h-[320px] rounded-[24px] bg-[#243047]" />
          <div className="space-y-[14px]">
            <div className="h-[24px] w-[220px] rounded-full bg-white/10" />
            <div className="h-[16px] w-full rounded-full bg-white/5" />
            <div className="h-[16px] w-[90%] rounded-full bg-white/5" />
            <div className="h-[16px] w-[85%] rounded-full bg-white/5" />
            <div className="mt-[20px] h-[140px] rounded-[20px] bg-[#243047]" />
          </div>
        </div>
      </Panel>
    </div>
  );
}