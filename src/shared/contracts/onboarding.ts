import { z } from 'zod';

export const onboardingStepSchema = z.enum(['welcome', 'shortcut', 'capture']);
export const onboardingStateSchema = z.strictObject({
  version: z.number().int().nonnegative(),
  step: onboardingStepSchema,
  saved: z.boolean(),
  completed: z.boolean(),
  error: z.string().max(300).nullable()
});
export const onboardingChannel = 'promptly:onboarding-status';
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export interface OnboardingStatusBridge {
  subscribe: (listener: (state: OnboardingState) => void) => () => void;
}
