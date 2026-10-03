import { z } from 'zod';

import { acceleratorSchema } from './accelerator';
import { revisionSchema } from './domain';

export const shortcutSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('double-tap'),
    modifier: z.enum(['shift', 'control', 'alt', 'meta'])
  }),
  z.strictObject({ kind: z.literal('combination'), accelerator: acceleratorSchema })
]);
export const windowBoundsSchema = z.strictObject({
  x: z.number().int().min(-100_000).max(100_000),
  y: z.number().int().min(-100_000).max(100_000),
  width: z.number().int().min(400).max(10_000),
  height: z.number().int().min(320).max(10_000)
});
export const settingsSchema = z.strictObject({
  launchAtLogin: z.boolean(),
  showInTray: z.boolean(),
  // Retained for old profiles/backups; copying always leaves window visibility unchanged.
  hideAfterCopy: z.enum(['automatic', 'always', 'never']),
  defaultSizeMode: z.enum(['compact', 'regular']),
  saveShortcut: shortcutSchema,
  openShortcut: acceleratorSchema,
  pinShortcut: acceleratorSchema.nullable(),
  doubleTapWindowMs: z.number().int().min(150).max(600),
  showConfirmationToast: z.boolean(),
  normalizeWhitespace: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  alwaysOnTop: z.boolean(),
  rememberedBounds: z.strictObject({
    compact: windowBoundsSchema.nullable(),
    regular: windowBoundsSchema.nullable()
  }),
  onboardingComplete: z.boolean()
});
export const settingsPatchSchema = settingsSchema
  .partial()
  .refine(
    (patch) =>
      Object.keys(patch).length > 0 && Object.values(patch).every((value) => value !== undefined)
  );
export const settingsSnapshotSchema = z.strictObject({
  revision: revisionSchema,
  settings: settingsSchema
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type SettingsSnapshot = z.infer<typeof settingsSnapshotSchema>;

export function defaultSettings(): Settings {
  return {
    launchAtLogin: false,
    showInTray: true,
    hideAfterCopy: 'never',
    defaultSizeMode: 'compact',
    saveShortcut: { kind: 'double-tap', modifier: 'shift' },
    openShortcut: 'Alt+Space',
    pinShortcut: null,
    doubleTapWindowMs: 300,
    showConfirmationToast: true,
    normalizeWhitespace: true,
    theme: 'system',
    alwaysOnTop: false,
    rememberedBounds: { compact: null, regular: null },
    onboardingComplete: false
  };
}
