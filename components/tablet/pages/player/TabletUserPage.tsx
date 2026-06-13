'use client';

import {
  Panel,
  SectionTitle,
} from '../shared/TabletPagePrimitives';

type TabletUserPageProps = {
  isEditable: boolean;
};

export default function TabletUserPage({ isEditable }: TabletUserPageProps) {
  return (
    <div className="h-full">
      <SectionTitle title="User" subtitle="Base tablet layout preview" />

      <div className="grid h-[calc(100%-72px)] grid-cols-[320px_1fr] gap-[18px]">
        <Panel className="flex flex-col items-center justify-center">
          <div className="h-[180px] w-[180px] rounded-full border border-white/10 bg-[#D9D9D9]" />
          <div className="mt-[18px] h-[22px] w-[180px] rounded-full bg-white/10" />
          <div className="mt-[10px] h-[16px] w-[130px] rounded-full bg-white/5" />
        </Panel>

        <Panel>
          <div className="space-y-[12px]">
            <div className="h-[20px] w-[240px] rounded-full bg-white/10" />
            <div className="h-[16px] w-full rounded-full bg-white/5" />
            <div className="h-[16px] w-[95%] rounded-full bg-white/5" />
            <div className="h-[16px] w-[88%] rounded-full bg-white/5" />
            <div className="h-[16px] w-[80%] rounded-full bg-white/5" />
          </div>
        </Panel>
      </div>
    </div>
  );
}