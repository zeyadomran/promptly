import { z } from 'zod';

export const snippetSourceSchema = z.strictObject({
  available: z.boolean(),
  explanation: z.string().max(256)
});
export type SnippetSource = z.infer<typeof snippetSourceSchema>;
