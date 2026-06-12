'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletPartyPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Party" subtitle="Master party overview preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-2 gap-[18px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <Panel key={index}>
            <div className="flex items-center gap-[14px]">
              <div className="h-[72px] w-[72px] rounded-full bg-[#243047]" />
              <div className="flex-1 space-y-[10px]">
                <div className="h-[18px] w-[140px] rounded-full bg-white/10" />
                <div className="h-[14px] w-[80%] rounded-full bg-white/5" />
                <div className="h-[14px] w-[65%] rounded-full bg-white/5" />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}