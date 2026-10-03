import { z } from 'zod';

import { idSchema, snippetTextSchema } from './domain';
import { shortcutTestSchema } from './shortcut-test';

export const onboardingStepSchema = z.enum([
  'welcome',
  'guide',
  'shortcut',
  'detected',
  'capture',
  'preferences',
  'done'
]);
export const onboardingDestinationSchema = z.enum(['library', 'wiki']);
export type OnboardingDestination = z.infer<typeof onboardingDestinationSchema>;
export const onboardingStateSchema = z.strictObject({
  version: z.number().int().nonnegative(),
  step: onboardingStepSchema,
  saved: z.boolean(),
  preview: z
    .strictObject({
      id: idSchema,
      text: snippetTextSchema,
      sourceApp: z.string().max(256).nullable()
    })
    .nullable(),
  test: shortcutTestSchema,
  completed: z.boolean(),
  error: z.string().max(300).nullable()
});
export const onboardingChannel = 'promptly:onboarding-status';
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export interface OnboardingStatusBridge {
  subscribe: (listener: (state: OnboardingState) => void) => () => void;
}
