import { expect, it } from 'vitest';

import { defaultLocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { queueKeyCommand } from './queue-keyboard';

it('scopes queue copy and completion keys while preserving native controls and configured moves', () => {
  const event: ShortcutKeyEvent = {
    key: 'Enter',
    code: 'Enter',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    altGraph: false
  };
  const state = {
    active: true,
    prevented: false,
    focus: 'library' as const,
    selected: true,
    open: true
  };
  const shortcuts = defaultLocalShortcuts();

  expect(queueKeyCommand(event, state, shortcuts)).toBe('copy');
  expect(queueKeyCommand({ ...event, ctrlKey: true }, state, shortcuts)).toBe('copy-return');
  expect(
    queueKeyCommand({ ...event, key: 'd', code: 'KeyD', ctrlKey: true }, state, shortcuts)
  ).toBe('complete');
  expect(
    queueKeyCommand(
      { ...event, key: 'ArrowDown', code: 'ArrowDown', altKey: true },
      state,
      shortcuts
    )
  ).toBe('move-down');
  expect(
    queueKeyCommand(
      { ...event, key: 'ArrowDown', code: 'ArrowDown', altKey: true },
      { ...state, open: false },
      shortcuts
    )
  ).toBeUndefined();
  for (const focus of ['editor', 'control', 'overlay'] as const)
    expect(queueKeyCommand(event, { ...state, focus }, shortcuts)).toBeUndefined();
  expect(queueKeyCommand({ ...event, isComposing: true }, state, shortcuts)).toBeUndefined();
  expect(queueKeyCommand(event, { ...state, active: false }, shortcuts)).toBeUndefined();
  expect(
    queueKeyCommand({ ...event, ctrlKey: true }, state, { ...shortcuts, copyAndReturn: null })
  ).toBeUndefined();
});
