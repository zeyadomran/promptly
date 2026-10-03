import { expect, it } from 'vitest';

import { defaultLocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import { shellKeyView } from './shell-keyboard';

it('routes wiki and view dismissal while leaving overlays, recording, composition and library commands to their owners', () => {
  const shortcuts = defaultLocalShortcuts();
  const input = {
    view: 'library' as const,
    key: 'F1',
    code: 'F1',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    prevented: false,
    overlay: false
  };

  expect(shellKeyView(input, shortcuts)).toBe('wiki');
  expect(shellKeyView({ ...input, view: 'wiki' }, shortcuts)).toBe('library');
  expect(shellKeyView({ ...input, view: 'settings' }, shortcuts)).toBe('wiki');
  expect(shellKeyView({ ...input, overlay: true }, shortcuts)).toBeUndefined();
  expect(shellKeyView({ ...input, prevented: true }, shortcuts)).toBeUndefined();
  expect(shellKeyView({ ...input, isComposing: true }, shortcuts)).toBeUndefined();
  expect(shellKeyView({ ...input, repeat: true }, shortcuts)).toBeUndefined();
  expect(shellKeyView({ ...input, ctrlKey: true }, shortcuts)).toBeUndefined();
  expect(shellKeyView({ ...input, key: 'Escape' }, shortcuts)).toBeUndefined();
  expect(shellKeyView({ ...input, key: 'Escape', view: 'settings' }, shortcuts)).toBe('library');
  expect(
    shellKeyView({ ...input, key: 'Escape', view: 'wiki', overlay: true }, shortcuts)
  ).toBeUndefined();
  expect(shellKeyView({ ...input, key: ',', ctrlKey: true, view: 'wiki' }, shortcuts)).toBe(
    'settings'
  );
  expect(shellKeyView({ ...input, key: ',', ctrlKey: true, view: 'settings' }, shortcuts)).toBe(
    'library'
  );
  expect(
    shellKeyView({ ...input, key: 's', view: 'wiki' }, { ...shortcuts, settings: 'S' })
  ).toBeUndefined();
});
