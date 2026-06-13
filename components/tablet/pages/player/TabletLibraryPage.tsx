'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

type TabletUserPageProps = {
  isEditable: boolean;
};

export default function TabletLibraryPage({ isEditable }: TabletUserPageProps) {
  return (
    <div className="h-full">
      <SectionTitle title="Library" subtitle="Entries and editor panel preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[1fr_360px] gap-[18px]">
        <Panel className="space-y-[14px]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[88px] rounded-[20px] border border-white/8 bg-[#243047]"
            />
          ))}
        </Panel>

        <Panel className="space-y-[14px]">
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#243047]" />
          <div className="h-[220px] rounded-[18px] bg-[#243047]" />
          <div className="h-[56px] rounded-[18px] bg-[#D6B25E]" />
        </Panel>
      </div>
    </div>
  );
}