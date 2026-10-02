import { z } from 'zod';

export const captureToastChannel = 'promptly:capture-confirmation';
export const captureToastSchema = z.strictObject({
  version: z.int().positive(),
  status: z.enum(['saved', 'duplicate']),
  preview: z.string().max(512),
  theme: z.enum(['light', 'dark', 'system']),
  phase: z.enum(['visible', 'leaving'])
});
export type CaptureToast = z.infer<typeof captureToastSchema>;
export interface CaptureToastBridge {
  subscribe: (listener: (toast: CaptureToast | null) => void) => () => void;
}
