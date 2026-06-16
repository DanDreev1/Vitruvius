"use client";

import Image from "next/image";

import { canEditTablet } from "@/features/tablet/navigation";
import type { TabletRole, TabletTab } from "@/features/tablet/types";
import type { TabletViewMode } from "@/lib/game/types";

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
  sessionId: string;
  inGameWorldId: string | null;
  participants: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "master" | "player";
  }>;
};

type SharedShellLayoutProps = TabletShellProps;

const playerAttributes = [
  { label: "Constitution", iconSrc: "/attributes-imgs/Cons.png", value: 1 },
  { label: "Awareness", iconSrc: "/attributes-imgs/Awareness.png", value: 1 },
  { label: "Agility", iconSrc: "/attributes-imgs/Agility.png", value: 1 },
  { label: "Thinking", iconSrc: "/attributes-imgs/Thinking.png", value: 1 },
  { label: "Charisma", iconSrc: "/attributes-imgs/Charisma.png", value: 1 },
  { label: "Will", iconSrc: "/attributes-imgs/Will.png", value: 1 },
];

const playerParameters = [
  { label: "Health", iconSrc: "/parameters/Health.png", value: 5 },
  { label: "Inspiration", iconSrc: "/parameters/Inspirations.png", value: 6 },
  { label: "Stress", iconSrc: "/parameters/Stress.png", value: 0 },
];

const editablePlayerTabs: TabletTab[] = ["user", "skills"];

function PlayerTabletShellLayout({
  activeTab,
  onTabChange,
  mode,
  targetRole,
  onClose,
  sessionId,
  inGameWorldId,
  participants,
}: SharedShellLayoutProps) {
  const isEditable = canEditTablet(targetRole, mode);
  const showEditButton = isEditable && editablePlayerTabs.includes(activeTab);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white bg-[#172033] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="absolute bottom-0 left-0 top-0 w-[112px] border-r border-white/45">
        <TabletNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          targetRole={targetRole}
          mode={mode}
          onClose={onClose}
        />
      </div>

      <div className="absolute left-[148px] right-[118px] top-[30px] flex h-[58px] items-center">
        <h1 className="w-[300px] font-montserrat-alt text-[42px] font-extrabold leading-none text-white">
          Name
        </h1>

        <div className="flex flex-1 items-center justify-between">
          {playerAttributes.map((attribute) => (
            <div key={attribute.label} className="flex items-center gap-[13px]">
              <Image src={attribute.iconSrc} alt="" width={43} height={43} />
              <span className="font-montserrat-alt text-[28px] font-extrabold leading-none text-white">
                {attribute.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showEditButton ? (
        <button
          type="button"
          className="absolute right-[34px] top-[34px] flex h-[42px] w-[42px] items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-75"
          title="Edit character"
        >
          <Image src="/Edit-icon.png" alt="" width={32} height={32} />
        </button>
      ) : null}

      <div className="absolute right-[22px] top-[145px] flex w-[90px] flex-col gap-[58px]">
        {playerParameters.map((parameter) => (
          <div key={parameter.label} className="flex flex-col items-center">
            <Image src={parameter.iconSrc} alt="" width={55} height={55} />
            <div className="mt-[20px] flex w-full items-center justify-center gap-[15px] font-montserrat-alt text-[27px] font-extrabold leading-none text-white">
              <span>-</span>
              <span>{parameter.value}</span>
              <span>+</span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-[44px] left-[152px] right-[130px] top-[108px]">
        <TabletPageRenderer
          activeTab={activeTab}
          targetRole={targetRole}
          mode={mode}
          isEditable={isEditable}
          sessionId={sessionId}
          inGameWorldId={inGameWorldId}
          participants={participants}
        />
      </div>
    </div>
  );
}

function MasterTabletShellLayout({
  activeTab,
  onTabChange,
  targetRole,
  mode,
  onClose,
  sessionId,
  inGameWorldId,
  participants,
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
          onClose={onClose}
        />
      </div>

      <div className="absolute left-[136px] right-[24px] top-[24px] bottom-[24px] rounded-[28px] border border-white/8 bg-[#151D2B] p-[22px]">
        <TabletPageRenderer
          activeTab={activeTab}
          targetRole={targetRole}
          mode={mode}
          isEditable={isEditable}
          sessionId={sessionId}
          inGameWorldId={inGameWorldId}
          participants={participants}
        />
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
