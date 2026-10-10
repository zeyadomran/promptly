import { expect, it } from 'vitest';

import { defaultLocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import { shellKeyCompose, shellKeyView, wikiShortcutAvailable } from './shell-keyboard';

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
  const copyOnF1 = { ...shortcuts, copy: 'F1' };

  expect(shellKeyView(input, copyOnF1)).toBeUndefined();
  expect(shellKeyView({ ...input, view: 'settings' }, copyOnF1)).toBeUndefined();
  expect(wikiShortcutAvailable(copyOnF1)).toBe(false);
  const settingsOnF1 = { ...shortcuts, settings: 'F1' };

  expect(shellKeyView({ ...input, view: 'wiki' }, settingsOnF1)).toBe('settings');
  expect(shellKeyView({ ...input, view: 'settings' }, settingsOnF1)).toBe('library');
  expect(shellKeyView(input, settingsOnF1)).toBeUndefined();
  expect(wikiShortcutAvailable(settingsOnF1)).toBe(false);
  expect(shellKeyView(input, shortcuts, ['F1'])).toBeUndefined();
  expect(wikiShortcutAvailable(shortcuts, ['F1'])).toBe(false);
  expect(wikiShortcutAvailable(shortcuts, ['Control+F1', null])).toBe(true);
  expect(wikiShortcutAvailable({ ...shortcuts, copy: 'Control+F1' })).toBe(true);
  expect(shellKeyView({ ...input, key: '2', code: 'Digit2', ctrlKey: true }, shortcuts)).toBe(
    'queue'
  );
  expect(
    shellKeyView({ ...input, view: 'queue', key: '1', code: 'Digit1', ctrlKey: true }, shortcuts)
  ).toBe('library');
  expect(shellKeyCompose({ ...input, key: 'n', code: 'KeyN', ctrlKey: true }, shortcuts)).toBe(
    true
  );
  expect(
    shellKeyCompose({ ...input, key: 'n', code: 'KeyN', ctrlKey: true, overlay: true }, shortcuts)
  ).toBe(false);
  expect(
    shellKeyCompose(
      { ...input, key: 'n', code: 'KeyN', ctrlKey: true, view: 'settings' },
      shortcuts
    )
  ).toBe(false);
  expect(
    shellKeyCompose(
      { ...input, key: 'n', code: 'KeyN', ctrlKey: true, isComposing: true },
      shortcuts
    )
  ).toBe(false);
});
