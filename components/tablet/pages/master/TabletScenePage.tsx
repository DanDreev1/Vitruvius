"use client";

import { useMemo, useState } from "react";

import { useSceneAnimation } from "@/features/tablet/master/scene/useSceneAnimation";
import { useSceneTabs } from "@/features/tablet/master/scene/useSceneTabs";
import type { SceneAudienceParticipant } from "@/features/tablet/master/scene/types";

import SceneAudiencePanel from "./TabletScenePage/SceneAudiencePanel";
import SceneTabSwitcher from "./TabletScenePage/SceneTabSwitcher";
import SceneViewport from "./TabletScenePage/SceneViewport";

type TabletScenePageProps = {
  inGameWorldId: string | null;
  participants?: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "master" | "player";
  }>;
};

export default function TabletScenePage({
  inGameWorldId,
  participants = [],
}: TabletScenePageProps) {
  const { activeTab, changeTab } = useSceneTabs();
  const { direction } = useSceneAnimation(activeTab);

  const audienceParticipants = useMemo<SceneAudienceParticipant[]>(() => {
    const playerItems = participants
      .filter((participant) => participant.role === "player")
      .map((participant) => ({
        id: participant.id,
        displayName: participant.display_name ?? "Nickname",
        avatarUrl: participant.avatar_url,
        role: participant.role,
      }));

    return [
      {
        id: "all",
        displayName: "All",
        avatarUrl: null,
        role: "player",
        isAll: true,
      },
      ...playerItems,
    ];
  }, [participants]);

  const [activeAudienceId, setActiveAudienceId] = useState<string>("all");

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-[44px] top-[28px] bottom-[92px] right-[360px]">
        <SceneViewport
          activeTab={activeTab}
          direction={direction}
          inGameWorldId={inGameWorldId}
        />
      </div>

      <div className="absolute right-0 top-[64px] bottom-[128px] w-[326px]">
        <SceneAudiencePanel
          participants={audienceParticipants}
          activeAudienceId={activeAudienceId}
          onAudienceSelect={setActiveAudienceId}
        />
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <SceneTabSwitcher activeTab={activeTab} onTabChange={changeTab} />
      </div>
    </div>
  );
}
