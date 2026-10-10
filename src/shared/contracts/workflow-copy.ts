import { z } from 'zod';

import { idSchema, revisionSchema, timestampSchema } from './domain';
import type { DesktopResult } from './result';

export const workflowLimits = { sources: 20, variables: 32, value: 100_000, text: 1_000_000 };
export const separatorSchema = z.enum(['blank-line', 'divider', 'tagged']);
export const savedCopySourceSchema = z.strictObject({
  kind: z.enum(['snippet', 'queue']),
  id: idSchema
});
export const workflowCopySourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('snippet'), id: idSchema }),
  z.strictObject({ kind: z.literal('queue'), id: idSchema }),
  z.strictObject({
    kind: z.literal('bundle'),
    ids: z
      .array(idSchema)
      .min(2)
      .max(workflowLimits.sources)
      .refine((ids) => new Set(ids).size === ids.length),
    separator: separatorSchema
  }),
  z.strictObject({
    kind: z.literal('draft'),
    draftId: idSchema,
    draftRevision: revisionSchema,
    text: z.string().max(workflowLimits.text),
    attachmentCount: z.number().int().min(0).max(8)
  })
]);
export const variableAnswerSchema = z
  .strictObject({
    value: z.string().max(workflowLimits.value),
    leaveBlank: z.boolean()
  })
  .refine((answer) => !answer.leaveBlank || answer.value.length === 0);
export const variableAnswersSchema = z
  .record(
    z
      .string()
      .max(128)
      .refine((name) => Array.from(name).length <= 64),
    variableAnswerSchema
  )
  .refine((values) => Object.keys(values).length <= workflowLimits.variables);
export const preparedCopySchema = z.strictObject({
  token: idSchema,
  source: workflowCopySourceSchema,
  segments: z
    .array(
      z.strictObject({
        kind: z.enum(['snippet', 'queue', 'draft']),
        id: idSchema,
        text: z.string().max(workflowLimits.text),
        fingerprint: z.string().regex(/^[a-f0-9]{64}$/u)
      })
    )
    .min(1)
    .max(workflowLimits.sources),
  text: z.string().max(workflowLimits.text),
  variables: z
    .array(
      z.strictObject({
        name: z
          .string()
          .min(1)
          .max(128)
          .refine((name) => Array.from(name).length <= 64),
        count: z.number().int().positive(),
        sourceIndexes: z
          .array(z.number().int().min(1).max(workflowLimits.sources))
          .min(1)
          .max(workflowLimits.sources)
      })
    )
    .max(workflowLimits.variables),
  attachmentCount: z
    .number()
    .int()
    .min(0)
    .max(8 * workflowLimits.sources),
  expiresAt: z.number().int().nonnegative()
});
export const workflowCopyOutcomeSchema = z.strictObject({
  status: z.literal('copied'),
  sourceIds: z.array(savedCopySourceSchema).max(workflowLimits.sources),
  attachmentCount: z
    .number()
    .int()
    .min(0)
    .max(8 * workflowLimits.sources),
  returned: z.enum(['not-requested', 'returned', 'unavailable', 'denied']),
  returnLabel: z.string().min(1).max(64).optional(),
  warnings: z.array(z.enum(['STATISTICS_UNCONFIRMED', 'RETURN_UNCONFIRMED'])).max(2),
  statistics: z
    .array(
      savedCopySourceSchema.extend({
        revision: revisionSchema,
        copyCount: z.number().int().nonnegative(),
        lastCopiedAt: timestampSchema
      })
    )
    .max(workflowLimits.sources)
    .optional()
});
export const workflowCopyOperations = {
  prepareCopy: {
    request: z.strictObject({ source: workflowCopySourceSchema }),
    response: preparedCopySchema
  },
  commitCopy: {
    request: z.strictObject({
      token: idSchema,
      values: variableAnswersSchema,
      format: z.enum(['text', 'markdown']),
      mode: z.enum(['resolved', 'as-written']),
      return: z.boolean(),
      draftRevision: revisionSchema.optional()
    }),
    response: workflowCopyOutcomeSchema
  },
  cancelPreparedCopy: { request: z.strictObject({ token: idSchema }), response: z.strictObject({}) }
} as const;

export type ContextSeparator = z.infer<typeof separatorSchema>;
export type SavedCopySource = z.infer<typeof savedCopySourceSchema>;
export type WorkflowCopySource = z.infer<typeof workflowCopySourceSchema>;
export type VariableAnswers = z.infer<typeof variableAnswersSchema>;
export type PreparedCopy = z.infer<typeof preparedCopySchema>;
export type WorkflowCopyOutcome = z.infer<typeof workflowCopyOutcomeSchema>;
export type CommitCopy = z.infer<typeof workflowCopyOperations.commitCopy.request>;
export type WorkflowCopyOperations = {
  readonly [K in keyof typeof workflowCopyOperations]: (
    input: z.infer<(typeof workflowCopyOperations)[K]['request']>,
    context?: { senderId: number }
  ) => Promise<DesktopResult<z.infer<(typeof workflowCopyOperations)[K]['response']>>>;
};
