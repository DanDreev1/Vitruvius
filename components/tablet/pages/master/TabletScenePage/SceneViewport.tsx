"use client";

import { AnimatePresence, motion } from "framer-motion";

import { SCENE_TAB_ANIMATION_MS } from "@/features/tablet/master/scene/constants";
import type {
  SceneAudienceState,
  SceneDirection,
  SceneTab,
} from "@/features/tablet/master/scene/types";

import SceneImagesPage from "./SceneImagesPage/SceneImagesPage";
import SceneMusicPage from "./SceneMusicPage";

type SceneViewportProps = {
  activeTab: SceneTab;
  direction: SceneDirection;
  sessionId: string;
  inGameWorldId: string | null;
  onAudienceStateChange: (state: SceneAudienceState | null) => void;
};

const transition = {
  duration: SCENE_TAB_ANIMATION_MS / 1000,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function SceneViewport({
  activeTab,
  direction,
  sessionId,
  inGameWorldId,
  onAudienceStateChange,
}: SceneViewportProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeTab}
          custom={direction}
          initial={{
            opacity: 0,
            x: direction === 1 ? 80 : -80,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: direction === 1 ? -80 : 80,
          }}
          transition={transition}
          className="absolute inset-0"
        >
          {activeTab === "images" ? (
            <SceneImagesPage
              sessionId={sessionId}
              inGameWorldId={inGameWorldId}
              onAudienceStateChange={onAudienceStateChange}
            />
          ) : (
            <SceneMusicPage />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
