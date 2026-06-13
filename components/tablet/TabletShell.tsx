"use client";

import type { TabletViewMode } from "@/lib/game/types";
import type { TabletRole, TabletTab } from "@/features/tablet/types";
import { canEditTablet } from '@/features/tablet/navigation';

import TabletNav from "./TabletNav";
import TabletPageRenderer from "./TabletPageRenderer";

type TabletShellProps = {
  activeTab: TabletTab;
  onTabChange: (tab: TabletTab) => void;
  viewerUserId: string;
  targetUserId: string;
  mode: TabletViewMode;
  targetRole: TabletRole;
  onClose: () => void;
};

function formatModeLabel(mode: TabletViewMode) {
  switch (mode) {
    case "self":
      return "Self";
    case "master":
      return "Master View";
    case "readonly-other":
      return "Read Only";
    default:
      return "Tablet";
  }
}

type SharedShellLayoutProps = TabletShellProps;

function PlayerTabletShellLayout({
  activeTab,
  onTabChange,
  viewerUserId,
  targetUserId,
  mode,
  targetRole,
  onClose,
}: SharedShellLayoutProps) {
  const isEditable = canEditTablet(targetRole, mode);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white/10 bg-[#1B2230] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-[16px] rounded-[28px] border border-white/8 bg-[#0F1724]" />

      <div className="absolute left-[24px] top-[24px] bottom-[24px] w-[92px] rounded-[26px] border border-white/8 bg-[#111827]">
        <TabletNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          targetRole={targetRole}
          mode={mode}
        />
      </div>

      <div className="absolute left-[136px] right-[112px] top-[24px] h-[76px] rounded-[26px] border border-white/8 bg-[#111827] px-[28px]">
        <div className="flex h-full items-center justify-between">
          <div>
            <p className="font-montserrat-alt text-[28px] font-extrabold text-[#D6B25E]">
              Player Tablet
            </p>
            <p className="font-montserrat text-[15px] text-white/65">
              Viewer: {viewerUserId.slice(0, 8)}... · Target:{" "}
              {targetUserId.slice(0, 8)}...
            </p>
          </div>

          <div className="flex items-center gap-[14px]">
            <div className="rounded-full border border-white/10 bg-[#1E293B] px-[18px] py-[10px]">
              <span className="font-montserrat text-[15px] font-semibold text-white">
                {formatModeLabel(mode)}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white px-[18px] py-[10px] font-montserrat text-[15px] font-bold text-black"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="absolute right-[24px] top-[24px] bottom-[24px] w-[72px] rounded-[26px] border border-white/8 bg-[#111827]">
        <div className="flex h-full flex-col items-center justify-between py-[24px]">
          {["HP", "IP", "SP", "ST"].map((label) => (
            <div
              key={label}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/10 bg-[#1E293B]"
            >
              <span className="font-montserrat text-[13px] font-bold text-white/80">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-[136px] right-[112px] top-[116px] bottom-[24px] rounded-[28px] border border-white/8 bg-[#151D2B] p-[22px]">
        <TabletPageRenderer activeTab={activeTab} targetRole={targetRole} mode={mode} isEditable={isEditable} />
      </div>
    </div>
  );
}

function MasterTabletShellLayout({
  activeTab,
  onTabChange,
  targetRole,
  mode,
}: SharedShellLayoutProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white/10 bg-[#1B2230] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-[16px] rounded-[28px] border border-white/8 bg-[#0F1724]" />

      <div className="absolute left-[24px] top-[24px] bottom-[24px] w-[92px] rounded-[26px] border border-white/8 bg-[#111827]">
        <TabletNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          targetRole={targetRole}
          mode={mode}
        />
      </div>

      <div className="absolute left-[136px] right-[24px] top-[24px] bottom-[24px] rounded-[28px] border border-white/8 bg-[#151D2B] p-[22px]">
        <TabletPageRenderer activeTab={activeTab} targetRole={targetRole} mode={mode} />
      </div>
    </div>
  );
}

export default function TabletShell(props: TabletShellProps) {
  if (props.targetRole === "master") {
    return <MasterTabletShellLayout {...props} />;
  }

  return <PlayerTabletShellLayout {...props} />;
}
