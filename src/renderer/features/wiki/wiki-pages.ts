import type { WikiPageId } from '../../../shared/contracts/wiki';
import attachments from './pages/Attachments-and-Drawing.md?raw';
import backup from './pages/Backup-and-Restore.md?raw';
import capture from './pages/Capturing-Text.md?raw';
import compose from './pages/Compose-and-Queue.md?raw';
import development from './pages/Development.md?raw';
import gettingStarted from './pages/Getting-Started.md?raw';
import home from './pages/Home.md?raw';
import shortcuts from './pages/Keyboard-Shortcuts.md?raw';
import library from './pages/Library-and-Search.md?raw';
import settings from './pages/Settings.md?raw';
import tags from './pages/Tags.md?raw';
import troubleshooting from './pages/Troubleshooting.md?raw';
import variables from './pages/Variables-and-Bundles.md?raw';

export interface WikiPage {
  id: WikiPageId;
  title: string;
  markdown: string;
}
/** Vendored wiki 63084f5a78bdcb4173a2534061141920e3e893a6; Vite embeds Markdown without network I/O. */
export const wikiPages: readonly WikiPage[] = [
  { id: 'Home', title: 'Home', markdown: home },
  { id: 'Getting-Started', title: 'Getting Started', markdown: gettingStarted },
  { id: 'Capturing-Text', title: 'Capturing Text', markdown: capture },
  { id: 'Library-and-Search', title: 'Library and Search', markdown: library },
  { id: 'Compose-and-Queue', title: 'Compose and Queue', markdown: compose },
  { id: 'Attachments-and-Drawing', title: 'Attachments and Drawing', markdown: attachments },
  { id: 'Variables-and-Bundles', title: 'Variables and Bundles', markdown: variables },
  { id: 'Tags', title: 'Tags', markdown: tags },
  { id: 'Keyboard-Shortcuts', title: 'Keyboard Shortcuts', markdown: shortcuts },
  { id: 'Settings', title: 'Settings', markdown: settings },
  { id: 'Backup-and-Restore', title: 'Backup and Restore', markdown: backup },
  { id: 'Troubleshooting', title: 'Troubleshooting', markdown: troubleshooting },
  { id: 'Development', title: 'Development', markdown: development }
];
