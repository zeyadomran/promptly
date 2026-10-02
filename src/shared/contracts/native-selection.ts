import { z } from 'zod';

export const selectionUnits = 1_048_576;
export const nativeFrameBytes = selectionUnits * 6 + 65_536;
export const nativeSourceSchema = z.strictObject({
  pid: z.int().min(1).max(2_147_483_647),
  name: z.string().regex(/^[A-Za-z0-9 _().-]{1,240}$/),
  id: z.string().regex(/^[A-Za-z0-9 _().-]{1,240}\.exe$/)
});
const envelope = { v: z.literal(1), id: z.string().min(1).max(128) };
const identity = z.string().regex(/^[a-f0-9]{32}$/);
const elapsedMs = z.number().nonnegative();
const metadata = {
  source: nativeSourceSchema.nullable().optional(),
  identity: identity.optional(),
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
      elapsedMs
    })
    .refine((result) => result.characterCount === result.text.length),
  nativeFailureSchema
]);
export const nativeForegroundSchema = z.union([
  z.strictObject({
    ...envelope,
    status: z.literal('ok'),
    identity,
    source: nativeSourceSchema.nullable()
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
  startupMs: elapsedMs
});
export const nativeActivationSchema = z.union([
  z.strictObject({ ...envelope, status: z.literal('ok') }),
  nativeFailureSchema
]);
export type NativeSource = z.infer<typeof nativeSourceSchema>;
export type NativeCaptureReply = z.infer<typeof nativeCaptureSchema>;
