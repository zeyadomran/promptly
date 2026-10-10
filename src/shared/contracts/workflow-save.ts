import { z } from 'zod';

import { idSchema, revisionSchema } from './domain';
import { contentWriteSchema } from './queue';

export const workflowSaveRequestSchema = contentWriteSchema
  .extend({
    destination: z.enum(['library', 'queue']),
    queueId: idSchema.optional(),
    draftId: idSchema,
    draftRevision: revisionSchema,
    return: z.boolean()
  })
  .refine((input) => input.queueId === undefined || input.destination === 'queue');
export const workflowSaveResponseSchema = z.strictObject({
  status: z.literal('saved'),
  destination: z.enum(['library', 'queue']),
  id: idSchema,
  revision: revisionSchema,
  returned: z.enum(['not-requested', 'returned', 'unavailable', 'denied']),
  returnLabel: z.string().min(1).max(64).optional(),
  warnings: z.array(z.literal('RETURN_UNCONFIRMED')).max(1)
});
export const workflowSaveOperations = {
  saveWorkflowDraft: { request: workflowSaveRequestSchema, response: workflowSaveResponseSchema }
} as const;
export type WorkflowSaveRequest = z.infer<typeof workflowSaveRequestSchema>;
export type WorkflowSaveOutcome = z.infer<typeof workflowSaveResponseSchema>;
