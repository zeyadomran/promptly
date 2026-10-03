import { expect, it } from 'vitest';

import { onboardingKeyAction } from './onboarding-keyboard';

it('navigates onboarding and chooses themes while preserving keyboard ownership', () => {
  const input = {
    key: 'Enter',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    step: 'welcome' as const,
    disabled: false,
    prevented: false,
    focus: 'library' as const
  };
  expect(onboardingKeyAction(input)).toEqual({ kind: 'step', step: 'guide' });
  expect(onboardingKeyAction({ ...input, step: 'shortcut' })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, step: 'capture' })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, step: 'done' })).toEqual({ kind: 'finish' });
  expect(onboardingKeyAction({ ...input, step: 'capture', key: 'ArrowLeft' })).toEqual({
    kind: 'step',
    step: 'shortcut'
  });
  expect(onboardingKeyAction({ ...input, step: 'preferences', key: '2' })).toEqual({
    kind: 'theme',
    theme: 'dark'
  });
  for (const focus of ['editor', 'search', 'control', 'overlay'] as const)
    expect(onboardingKeyAction({ ...input, focus })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, disabled: true })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, prevented: true })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, isComposing: true })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, repeat: true })).toBeUndefined();
  expect(onboardingKeyAction({ ...input, ctrlKey: true })).toBeUndefined();
});
