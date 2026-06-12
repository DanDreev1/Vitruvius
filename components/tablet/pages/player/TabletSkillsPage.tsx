'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

export default function TabletSkillsPage() {
  return (
    <div className="h-full">
      <SectionTitle title="Skills" subtitle="Navigation and content split preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[250px_1fr] gap-[18px]">
        <Panel className="space-y-[12px]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[58px] rounded-[18px] border border-white/8 bg-[#243047]"
            />
          ))}
        </Panel>

        <Panel>
          <div className="h-[24px] w-[220px] rounded-full bg-white/10" />
          <div className="mt-[18px] grid grid-cols-2 gap-[14px]">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[92px] rounded-[18px] border border-white/8 bg-[#243047]"
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}