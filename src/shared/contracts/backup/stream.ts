import { z } from 'zod';

import { membershipSchema, portableSnippetSchema, portableTagSchema } from './format';

export const streamHeaderSchema = z.strictObject({
  format: z.literal('promptly-library'),
  version: z.literal(2),
  encoding: z.literal('jsonl')
});
export const streamHeader = streamHeaderSchema.parse({
  format: 'promptly-library',
  version: 2,
  encoding: 'jsonl'
});
export const streamRecordSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('tag'), value: portableTagSchema }),
  z.strictObject({ type: z.literal('snippet'), value: portableSnippetSchema }),
  z.strictObject({ type: z.literal('membership'), value: membershipSchema })
]);
export const streamEndSchema = z.strictObject({
  type: z.literal('end'),
  tags: z.number().int().nonnegative(),
  snippets: z.number().int().nonnegative(),
  memberships: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/u)
});
// One million UTF-16 units can each require six JSON bytes. This bounds one record.
export const streamLineBytes = 6_004_096;
