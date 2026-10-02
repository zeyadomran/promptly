import { z } from 'zod';

export const selectionUnits = 1_048_576;
export const nativeFrameBytes = selectionUnits * 6 + 65_536;
export const nativeSourceSchema = z.strictObject({
  pid: z.int().min(1).max(2_147_483_647),
  name: z.string().regex(/^[\p{L}\p{N}._ -]{1,255}$/u),
  id: z
    .string()
    .regex(/^[\p{L}\p{N}._ -]{1,255}$/u)
    .refine((name) => name !== '.' && name !== '..')
});
export const nativeBoundsSchema = z.strictObject({
  x: z.int().min(-2_147_483_648).max(2_147_483_647),
  y: z.int().min(-2_147_483_648).max(2_147_483_647),
  width: z.int().positive().max(2_147_483_647),
  height: z.int().positive().max(2_147_483_647)
});
const envelope = { v: z.literal(1), id: z.string().min(1).max(128) };
const identity = z.string().regex(/^[a-f0-9]{32}$/);
const elapsedMs = z.number().nonnegative();
const metadata = {
  source: nativeSourceSchema.nullable().optional(),
  identity: identity.optional(),
  targetIntegrityLevel: z.int().nonnegative().nullable().optional(),
  elapsedMs: elapsedMs.optional()
};

export const nativeFailureSchema = z.strictObject({
  ...envelope,
  ...metadata,
  status: z.enum([
    'empty',
    'unsupported',
    'permissionDenied',
    'secureInput',
    'foregroundChanged',
    'selectionTooLarge',
    'providerError',
    'invalidRequest',
    'activationDenied'
  ]),
  characterCount: z.literal(0).optional()
});
export const nativeCaptureSchema = z.union([
  z
    .strictObject({
      ...envelope,
      status: z.literal('ok'),
      source: nativeSourceSchema.nullable(),
      identity,
      text: z.string().min(1).max(selectionUnits),
      characterCount: z.int().min(1).max(selectionUnits),
      elapsedMs,
      targetIntegrityLevel: z.int().nonnegative().nullable()
    })
    .refine((result) => result.characterCount === result.text.length),
  nativeFailureSchema
]);
export const nativeForegroundSchema = z.union([
  z.strictObject({
    ...envelope,
    status: z.literal('ok'),
    identity,
    source: nativeSourceSchema.nullable(),
    windowHandle: z
      .string()
      .regex(/^[a-f0-9]{16}$/)
      .optional(),
    bounds: nativeBoundsSchema.nullable().optional()
  }),
  nativeFailureSchema
]);
export const nativeReadySchema = z.strictObject({
  ...envelope,
  status: z.literal('ok'),
  platform: z.literal('win32'),
  selection: z.literal('UIAutomation.TextPattern'),
  warmupReady: z.boolean(),
  warmupMs: elapsedMs,
  startupMs: elapsedMs,
  integrityLevel: z.int().nonnegative().nullable()
});
export const nativeActivationSchema = z.union([
  z.strictObject({ ...envelope, status: z.literal('ok') }),
  nativeFailureSchema
]);
export type NativeSource = z.infer<typeof nativeSourceSchema>;
export type NativeBounds = z.infer<typeof nativeBoundsSchema>;
export type NativeCaptureReply = z.infer<typeof nativeCaptureSchema>;
