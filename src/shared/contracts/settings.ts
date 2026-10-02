import { z } from 'zod';

import { revisionSchema } from './domain';

export const shortcutSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('double-tap'),
    modifier: z.enum(['shift', 'control', 'alt', 'meta'])
  }),
  z.strictObject({ kind: z.literal('combination'), accelerator: z.string().min(1).max(128) })
]);
export const settingsSchema = z.strictObject({
  launchAtLogin: z.boolean(),
  showInTray: z.boolean(),
  showDockIcon: z.boolean(),
  hideAfterCopy: z.enum(['automatic', 'always', 'never']),
  defaultSizeMode: z.enum(['compact', 'regular']),
  saveShortcut: shortcutSchema,
  openShortcut: z.string().min(1).max(128),
  pinShortcut: z.string().min(1).max(128).nullable(),
  doubleTapWindowMs: z.number().int().min(150).max(600),
  showConfirmationToast: z.boolean(),
  normalizeWhitespace: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  alwaysOnTop: z.boolean(),
  onboardingComplete: z.boolean()
});
export const settingsPatchSchema = settingsSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0);
export const settingsSnapshotSchema = z.strictObject({
  revision: revisionSchema,
  settings: settingsSchema
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
