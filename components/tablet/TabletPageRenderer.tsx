'use client';

import type { TabletRole, TabletTab } from '@/features/tablet/types';

import TabletUserPage from './pages/player/TabletUserPage';
import TabletSkillsPage from './pages/player/TabletSkillsPage';
import TabletBackpackPage from './pages/player/TabletBackpackPage';
import TabletLibraryPage from './pages/player/TabletLibraryPage';
import TabletRelationshipPlayerPage from './pages/player/TabletRelationshipPage';
import TabletSettingsPlayerPage from './pages/player/TabletSettingsPage';

import TabletScenePage from './pages/master/TabletScenePage';
import TabletPartyPage from './pages/master/TabletPartyPage';
import TabletAssetsPage from './pages/master/TabletAssetsPage';
import TabletRelationshipMasterPage from './pages/master/TabletRelationshipPage';
import TabletSettingsMasterPage from './pages/master/TabletSettingsPage';


import TabletNotesPage from './pages/shared/TabletNotesPage';


type TabletPageRendererProps = {
  activeTab: TabletTab;
  targetRole: TabletRole;
};

export default function TabletPageRenderer({
  activeTab,
  targetRole,
}: TabletPageRendererProps) {
  if (targetRole === 'master') {
    switch (activeTab) {
      case 'scene':
        return <TabletScenePage />;
      case 'party':
        return <TabletPartyPage />;
      case 'relationship':
        return <TabletRelationshipMasterPage />;
      case 'assets':
        return <TabletAssetsPage />;
      case 'notes':
        return <TabletNotesPage />;
      case 'settings':
        return <TabletSettingsMasterPage />;
      default:
        return <TabletScenePage />;
    }
  }

  switch (activeTab) {
    case 'user':
      return <TabletUserPage />;
    case 'skills':
      return <TabletSkillsPage />;
    case 'backpack':
      return <TabletBackpackPage />;
    case 'library':
      return <TabletLibraryPage />;
    case 'relationship':
      return <TabletRelationshipPlayerPage />;
    case 'notes':
      return <TabletNotesPage />;
    case 'settings':
      return <TabletSettingsPlayerPage />;
    default:
      return <TabletUserPage />;
  }
}