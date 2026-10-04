import { z } from 'zod';

export const sizeModeSchema = z.enum(['compact', 'regular']);
export const windowKindSchema = z.enum(['main', 'settings', 'onboarding']);
export const windowStateSchema = z.strictObject({
  mode: sizeModeSchema,
  kind: windowKindSchema,
  visible: z.boolean()
});
export type SizeMode = z.infer<typeof sizeModeSchema>;
export type WindowKind = z.infer<typeof windowKindSchema>;
export type WindowState = z.infer<typeof windowStateSchema>;
export const windowRecoverySchema = z.strictObject({
  tray: z.boolean(),
  trayController: z.boolean(),
  shortcut: z.boolean(),
  mainReachable: z.boolean()
});
export type WindowRecoveryState = z.infer<typeof windowRecoverySchema>;
export const focusSearchChannel = 'promptly:focus-search';
export const shellNavigationChannel = 'promptly:shell-navigation';
export const shellNavigationSchema = z.enum(['library', 'settings', 'wiki']);
export type NativeShellView = z.infer<typeof shellNavigationSchema>;
