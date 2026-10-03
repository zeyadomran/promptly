import type { OnboardingState } from '../../shared/contracts/onboarding';
import type { CaptureEvent } from '../capture/ports';

export function initialOnboardingState(completed: boolean): OnboardingState {
  return {
    version: 0,
    step: 'welcome',
    saved: false,
    preview: null,
    test: { status: 'inactive' },
    completed,
    error: null
  };
}

export function capturedOnboardingState(
  state: OnboardingState,
  event: CaptureEvent
): OnboardingState {
  if ((event.status === 'saved' || event.status === 'duplicate') && event.preview !== undefined)
    return {
      ...state,
      step: 'preferences',
      saved: true,
      preview: {
        id: event.preview.id,
        text: event.preview.text,
        sourceApp: event.preview.sourceApp
      },
      error: null
    };
  if (event.status === 'failed' || event.status === 'empty')
    return {
      ...state,
      error: 'Windows could not save this selection. Select the sample again, or choose Skip.'
    };
  return state;
}
