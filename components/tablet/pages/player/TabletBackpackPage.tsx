'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletBackpackPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Backpack" subtitle="Grid + side panel preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_320px] gap-[18px]">
        <div className="flex h-full flex-col gap-[18px]">
          <Panel className="h-[74px]" />
          <Panel className="flex-1">
            <div className="grid grid-cols-4 gap-[14px]">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-[18px] border border-white/8 bg-[#243047]"
                />
              ))}
            </div>
          </Panel>
        </div>

        <Panel>
          <div className="h-[26px] w-[160px] rounded-full bg-white/10" />
          <div className="mt-[18px] h-[220px] rounded-[20px] bg-[#243047]" />
          <div className="mt-[18px] space-y-[10px]">
            <div className="h-[16px] w-full rounded-full bg-white/5" />
            <div className="h-[16px] w-[92%] rounded-full bg-white/5" />
            <div className="h-[16px] w-[80%] rounded-full bg-white/5" />
          </div>
        </Panel>
      </div>
    </div>
  );
}