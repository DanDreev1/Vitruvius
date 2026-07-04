import type messages from '../messages/en.json';
import type studioMessages from '../messages/en.studio.json';
import type lobbyMessages from '../messages/en.lobby.json';
import type studioShellMessages from '../messages/en.studio-shell.json';
import type studioEditorMessages from '../messages/en.studio-editor.json';
import type studioMasterMessages from '../messages/en.studio-master.json';
import type gameMessages from '../messages/en.game.json';
import type { Locale } from './config';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages & typeof studioMessages & typeof studioShellMessages & typeof studioEditorMessages & typeof studioMasterMessages & typeof lobbyMessages & typeof gameMessages;
  }
}
