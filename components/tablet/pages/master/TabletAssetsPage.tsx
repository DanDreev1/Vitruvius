'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletAssetsPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Assets" subtitle="Master assets library preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_320px] gap-[18px]">
        <Panel>
          <div className="grid grid-cols-3 gap-[14px]">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="aspect-video rounded-[18px] border border-white/8 bg-[#243047]"
              />
            ))}
          </div>
        </Panel>

        <Panel className="space-y-[14px]">
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[220px] rounded-[18px] bg-[#243047]" />
        </Panel>
      </div>
    </div>
  );
}