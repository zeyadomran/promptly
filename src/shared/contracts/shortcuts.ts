import { z } from 'zod';

export const modifierSchema = z.enum(['shift', 'control', 'alt', 'meta']);
export type Modifier = z.infer<typeof modifierSchema>;
export const hookFrameSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('ready'),
    installed: z.boolean(),
    mask: z.number().int().min(0).max(255),
    timeMs: z.number().nonnegative()
  }),
  z.strictObject({
    kind: z.literal('health'),
    installed: z.boolean(),
    timeMs: z.number().nonnegative()
  }),
  z.strictObject({
    kind: z.literal('modifiers'),
    mask: z.number().int().min(0).max(255),
    repeat: z.boolean(),
    timeMs: z.number().nonnegative()
  }),
  z.strictObject({ kind: z.literal('cancel'), timeMs: z.number().nonnegative() }),
  z.strictObject({ kind: z.literal('reset'), timeMs: z.number().nonnegative() })
]);
export type HookFrame = z.infer<typeof hookFrameSchema>;
export const shortcutStatusSchema = z.strictObject({
  capture: z.enum(['registered', 'unavailable']),
  open: z.enum(['registered', 'unavailable']),
  pin: z.enum(['registered', 'unavailable', 'disabled']),
  compose: z.enum(['registered', 'unavailable', 'disabled']),
  hook: z.enum(['installed', 'unavailable', 'suspended']),
  capturePaused: z.boolean(),
  recording: z.boolean(),
  quarantined: z.boolean(),
  captureHandlerAvailable: z.boolean(),
  labels: z.strictObject({
    capture: z.string().max(128),
    open: z.string().max(128),
    pin: z.string().max(128).nullable(),
    compose: z.string().max(128).nullable()
  })
});
export type ShortcutStatus = z.infer<typeof shortcutStatusSchema>;
