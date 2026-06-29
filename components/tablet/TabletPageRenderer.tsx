"use client";

import { isTabletTabAllowed } from "@/features/tablet/navigation";
import type {
  TabletParticipant,
  TabletRole,
  TabletTab,
} from "@/features/tablet/types";
import type {
  TabletPlayerCharacter,
  TabletPlayerCharacterDraft,
  TabletPlayerExperience,
} from "@/features/tablet/player/types";
import type { TabletViewMode } from "@/lib/game/types";

import TabletUserPage from "./pages/player/TabletUserPage";
import TabletSkillsPage from "./pages/player/SkillsPage";
import TabletBackpackPage from "./pages/player/TabletBackpackPage";
import TabletLibraryPage from "./pages/player/TabletLibraryPage";
import TabletRelationshipPlayerPage from "./pages/player/TabletRelationshipPage";
import TabletSettingsPlayerPage from "./pages/player/TabletSettingsPage";

import TabletScenePage from "./pages/master/TabletScenePage";
import TabletPartyPage from "./pages/master/TabletPartyPage";
import TabletAssetsPage from "./pages/master/TabletAssetsPage";
import TabletRelationshipMasterPage from "./pages/master/TabletRelationshipPage";
import TabletSettingsMasterPage from "./pages/master/TabletSettingsPage";

import TabletNotesPage from "./pages/shared/TabletNotesPage";

type TabletPageRendererProps = {
  activeTab: TabletTab;
  targetRole: TabletRole;
  mode: TabletViewMode;
  isEditable: boolean;
  viewerUserId: string;
  sessionId: string;
  inGameWorldId: string | null;
  participants?: TabletParticipant[];
  playerCharacter?: TabletPlayerCharacter | null;
  isPlayerCharacterLoading?: boolean;
  playerCharacterError?: string | null;
  isEditMode?: boolean;
  characterDraft?: TabletPlayerCharacterDraft;
  portraitStatusMessage?: string | null;
  isPortraitSelectionDisabled?: boolean;
  onClose?: () => void;
  onDescriptionChange?: (description: string) => void;
  onDomainAdd?: () => string | null | undefined;
  onDomainDelete?: (domainId: string) => void;
  onDomainNameChange?: (domainId: string, name: string) => void;
  onDomainIconChange?: (domainId: string, iconKey: string) => void;
  onDomainIconFileSelect?: (domainId: string, file: File | null) => void;
  onDomainLevelChange?: (domainId: string, level: number) => void;
  onDomainSkillAdd?: (domainId: string) => string | null | undefined;
  onDomainSkillDelete?: (domainId: string, skillId: string) => void;
  onDomainSkillNameChange?: (
    domainId: string,
    skillId: string,
    name: string
  ) => void;
  onDomainSkillIconChange?: (
    domainId: string,
    skillId: string,
    iconKey: string
  ) => void;
  onDomainSkillIconFileSelect?: (
    domainId: string,
    skillId: string,
    file: File | null
  ) => void;
  onDomainSkillDescriptionChange?: (
    domainId: string,
    skillId: string,
    description: string
  ) => void;
  onDomainSkillLevelChange?: (
    domainId: string,
    skillId: string,
    level: number
  ) => void;
  onPortraitChangeRequest?: () => boolean;
  onPortraitFileSelect?: (file: File | null) => void;
  onExperiencesSaved?: (experiences: TabletPlayerExperience[]) => void;
};

export default function TabletPageRenderer({
  activeTab,
  targetRole,
  mode,
  isEditable,
  viewerUserId,
  sessionId,
  inGameWorldId,
  participants = [],
  playerCharacter = null,
  isPlayerCharacterLoading = false,
  playerCharacterError = null,
  isEditMode = false,
  characterDraft,
  portraitStatusMessage = null,
  isPortraitSelectionDisabled = false,
  onClose,
  onDescriptionChange,
  onDomainAdd,
  onDomainDelete,
  onDomainNameChange,
  onDomainIconChange,
  onDomainIconFileSelect,
  onDomainLevelChange,
  onDomainSkillAdd,
  onDomainSkillDelete,
  onDomainSkillNameChange,
  onDomainSkillIconChange,
  onDomainSkillIconFileSelect,
  onDomainSkillDescriptionChange,
  onDomainSkillLevelChange,
  onPortraitChangeRequest,
  onPortraitFileSelect,
  onExperiencesSaved,
}: TabletPageRendererProps) {
  if (!isTabletTabAllowed(activeTab, targetRole, mode)) {
    return null;
  }

  const currentParticipant =
    participants.find((participant) => participant.user_id === viewerUserId) ?? null;

  if (targetRole === "master") {
    switch (activeTab) {
      case "scene":
        return (
          <TabletScenePage
            sessionId={sessionId}
            inGameWorldId={inGameWorldId}
            participants={participants}
          />
        );
      case "party":
        return (
          <TabletPartyPage
            sessionId={sessionId}
            inGameWorldId={inGameWorldId}
            onClose={onClose}
          />
        );
      case "relationship":
        return (
          <TabletRelationshipMasterPage
            sessionId={sessionId}
            inGameWorldId={inGameWorldId}
          />
        );
      case "assets":
        return (
          <TabletAssetsPage
            sessionId={sessionId}
            inGameWorldId={inGameWorldId}
          />
        );
      case "notes":
        return <TabletNotesPage />;
      case "settings":
        return (
          <TabletSettingsMasterPage
            sessionId={sessionId}
            participant={currentParticipant}
            viewerUserId={viewerUserId}
          />
        );
      default:
        return (
          <TabletScenePage
            sessionId={sessionId}
            inGameWorldId={inGameWorldId}
            participants={participants}
          />
        );
    }
  }

  switch (activeTab) {
    case "user":
      return (
        <TabletUserPage
          isEditable={isEditable}
          character={playerCharacter}
          isLoading={isPlayerCharacterLoading}
          error={playerCharacterError}
          isEditMode={isEditMode}
          draft={characterDraft}
          portraitStatusMessage={portraitStatusMessage}
          isPortraitSelectionDisabled={isPortraitSelectionDisabled}
          onDescriptionChange={onDescriptionChange}
          onPortraitChangeRequest={onPortraitChangeRequest}
          onPortraitFileSelect={onPortraitFileSelect}
        />
      );
    case "skills":
      return (
        <TabletSkillsPage
          isEditable={isEditable}
          character={playerCharacter}
          isLoading={isPlayerCharacterLoading}
          error={playerCharacterError}
          isEditMode={isEditMode}
          draft={characterDraft}
          onDomainAdd={onDomainAdd}
          onDomainDelete={onDomainDelete}
          onDomainNameChange={onDomainNameChange}
          onDomainIconChange={onDomainIconChange}
          onDomainIconFileSelect={onDomainIconFileSelect}
          onDomainLevelChange={onDomainLevelChange}
          onDomainSkillAdd={onDomainSkillAdd}
          onDomainSkillDelete={onDomainSkillDelete}
          onDomainSkillNameChange={onDomainSkillNameChange}
          onDomainSkillIconChange={onDomainSkillIconChange}
          onDomainSkillIconFileSelect={onDomainSkillIconFileSelect}
          onDomainSkillDescriptionChange={onDomainSkillDescriptionChange}
          onDomainSkillLevelChange={onDomainSkillLevelChange}
        />
      );
    case "backpack":
      return (
        <TabletBackpackPage
          sessionId={sessionId}
          characterId={playerCharacter?.id ?? null}
          mode={mode}
        />
      );
    case "library":
      return (
        <TabletLibraryPage
          isEditable={isEditable}
          character={playerCharacter}
          isLoading={isPlayerCharacterLoading}
          error={playerCharacterError}
          onExperiencesSaved={onExperiencesSaved}
        />
      );
    case "relationship":
      return (
        <TabletRelationshipPlayerPage
          sessionId={sessionId}
          inGameWorldId={inGameWorldId}
          inGameCharacterId={playerCharacter?.id ?? null}
        />
      );
    case "notes":
      return <TabletNotesPage />;
    case "settings":
      return (
        <TabletSettingsPlayerPage
          sessionId={sessionId}
          participant={currentParticipant}
          viewerUserId={viewerUserId}
        />
      );
    default:
      return (
        <TabletUserPage
          isEditable={isEditable}
          character={playerCharacter}
          isLoading={isPlayerCharacterLoading}
          error={playerCharacterError}
          isEditMode={isEditMode}
          draft={characterDraft}
          portraitStatusMessage={portraitStatusMessage}
          isPortraitSelectionDisabled={isPortraitSelectionDisabled}
          onDescriptionChange={onDescriptionChange}
          onPortraitChangeRequest={onPortraitChangeRequest}
          onPortraitFileSelect={onPortraitFileSelect}
        />
      );
  }
}
