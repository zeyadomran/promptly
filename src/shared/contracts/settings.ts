import { z } from 'zod';

import { globalBindingAllowed } from '../shortcuts/global-binding';
import { acceleratorSchema } from './accelerator';
import { revisionSchema } from './domain';
import { defaultLocalShortcuts, localShortcutsSchema } from './local-shortcuts';

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
  composeShortcut: acceleratorSchema.nullable(),
  composeDestination: z.enum(['queue', 'library']),
  promptVariables: z.boolean(),
  localShortcuts: localShortcutsSchema,
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
  )
  .refine(
    (patch) =>
      [
        patch.openShortcut,
        patch.pinShortcut,
        patch.composeShortcut,
        patch.saveShortcut?.kind === 'combination' ? patch.saveShortcut.accelerator : undefined
      ].every((accelerator) => accelerator == null || globalBindingAllowed(accelerator)),
    'Global text shortcuts need Ctrl, Alt or Win in addition to Shift.'
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
    composeShortcut: 'Alt+Shift+N',
    composeDestination: 'queue',
    promptVariables: true,
    localShortcuts: defaultLocalShortcuts(),
    doubleTapWindowMs: 300,
    showConfirmationToast: true,
    normalizeWhitespace: true,
    theme: 'system',
    alwaysOnTop: false,
    rememberedBounds: { compact: null, regular: null },
    onboardingComplete: false
  };
}
