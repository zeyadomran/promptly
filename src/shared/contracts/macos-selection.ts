import { z } from 'zod';

import type { nativeForegroundSchema } from './native-selection';
import { nativeFailureSchema, selectionUnits } from './native-selection';

const envelope = { v: z.literal(1), id: z.string().min(1).max(128) };

// macOS provenance is bundle identity, never a URL, executable path or window title.
export const macosSourceSchema = z.strictObject({
  pid: z.int().min(1).max(2_147_483_647),
  name: z.string().regex(/^[\p{L}\p{N}._ -]{1,255}$/u),
  id: z
    .string()
    .regex(/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/)
    .max(255)
});
export const macosForegroundSchema = z.union([
  z.strictObject({
    ...envelope,
    status: z.literal('ok'),
    identity: z.string().regex(/^[a-f0-9]{32}$/),
    source: macosSourceSchema.nullable()
  }),
  nativeFailureSchema
]);
export const macosCaptureSchema = z.union([
  z
    .strictObject({
      ...envelope,
      status: z.literal('ok'),
      source: macosSourceSchema.nullable(),
      identity: z.string().regex(/^[a-f0-9]{32}$/),
      text: z.string().min(1).max(selectionUnits),
      characterCount: z.int().min(1).max(selectionUnits),
      elapsedMs: z.number().nonnegative()
    })
    .refine((reply) => reply.characterCount === reply.text.length),
  nativeFailureSchema
]);
export const macosPermissionSnapshotSchema = z.strictObject({
  accessibility: z.enum(['granted', 'denied', 'unknown']),
  inputMonitoring: z.enum(['granted', 'denied', 'unknown']),
  inputMonitoringRequiredFor: z.literal('passiveKeyboardHook'),
  selectionRequires: z.literal('accessibility')
});
export const macosPermissionsSchema = z.strictObject({
  ...envelope,
  status: z.literal('ok'),
  ...macosPermissionSnapshotSchema.shape
});
export const macosReadySchema = z.strictObject({
  ...envelope,
  status: z.literal('ok'),
  platform: z.literal('darwin'),
  selection: z.literal('AXSelectedText'),
  warmupReady: z.boolean(),
  warmupMs: z.number().nonnegative(),
  startupMs: z.number().nonnegative()
});
export interface MacosIdentity {
  readonly token: string;
  readonly source: z.infer<typeof macosSourceSchema> | null;
}
export type MacosNativeFailure = Exclude<z.infer<typeof nativeForegroundSchema>['status'], 'ok'>;
