import { z } from 'zod';

export const captureToastChannel = 'promptly:capture-confirmation';
export const captureToastActivationChannel = 'promptly:open-capture-confirmation';
export const captureToastActivationSchema = z.int().positive();
export const captureToastSchema = z.strictObject({
  version: z.int().positive(),
  status: z.enum(['saved', 'duplicate']),
  preview: z.string().max(512),
  theme: z.enum(['light', 'dark', 'system']),
  phase: z.enum(['visible', 'leaving'])
});
export type CaptureToast = z.infer<typeof captureToastSchema>;
export interface CaptureToastBridge {
  activate: (version: number) => void;
  subscribe: (listener: (toast: CaptureToast | null) => void) => () => void;
}
