import { z } from 'zod';

export const wikiPageIds = [
  'Home',
  'Getting-Started',
  'Capturing-Text',
  'Library-and-Search',
  'Tags',
  'Keyboard-Shortcuts',
  'Settings',
  'Backup-and-Restore',
  'Troubleshooting',
  'Development'
] as const;
export const wikiPageIdSchema = z.enum(wikiPageIds);
export type WikiPageId = z.infer<typeof wikiPageIdSchema>;
export const wikiResourceSchema = z.enum([
  'repository',
  'releases',
  'development',
  'testing',
  'releasing',
  'contributors',
  'security',
  'licenses',
  'history'
]);
export type WikiResource = z.infer<typeof wikiResourceSchema>;
