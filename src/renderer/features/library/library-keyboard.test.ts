import { expect, it } from 'vitest';

import { defaultLocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import { editorCancelCommand, libraryKeyCommand } from './library-keyboard';

it('routes library navigation and copy while preserving text, IME, and overlay ownership', () => {
  const input = {
    key: 'Enter',
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    composing: false,
    prevented: false,
    repeat: false,
    active: true,
    focus: 'search' as const,
    selected: true,
    hasSearch: true
  };

  expect(libraryKeyCommand(input)).toBe('copy');
  expect(libraryKeyCommand({ ...input, repeat: true })).toBeUndefined();
  expect(
    libraryKeyCommand({ ...input, repeat: true, focus: 'library', key: 'Delete' })
  ).toBeUndefined();
  expect(libraryKeyCommand({ ...input, active: false })).toBeUndefined();
  expect(
    libraryKeyCommand({ ...input, active: false, focus: 'library', key: 'Delete' })
  ).toBeUndefined();
  expect(libraryKeyCommand({ ...input, active: false, ctrl: true, key: ',' })).toBe('settings');
  expect(libraryKeyCommand({ ...input, active: false, key: 'Escape' })).toBe('hide');
  expect(libraryKeyCommand({ ...input, repeat: true, key: 'ArrowDown' })).toBe('next');
  expect(libraryKeyCommand({ ...input, key: 'ArrowDown' })).toBe('next');
  expect(libraryKeyCommand({ ...input, key: 'Delete' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, focus: 'library', key: 'Delete' })).toBe('delete');
  expect(libraryKeyCommand({ ...input, selected: false })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, focus: 'editor' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, focus: 'overlay' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, composing: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: 'Escape' })).toBe('clear-search');
  expect(libraryKeyCommand({ ...input, key: 'Escape', hasSearch: false })).toBe('hide');
  const editorTag = { ...input, key: 't', ctrl: true, focus: 'editor' as const };

  expect(libraryKeyCommand(editorTag)).toBe('tag');
  expect(libraryKeyCommand({ ...editorTag, ctrl: false, meta: true, key: 'T' })).toBe('tag');
  expect(libraryKeyCommand({ ...editorTag, composing: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, repeat: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, prevented: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, active: false })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, selected: false })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, focus: 'overlay' })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, shift: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...editorTag, alt: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: 'f', ctrl: true, focus: 'editor' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: 'f', ctrl: true })).toBe('focus-search');
  const shortcuts = {
    ...defaultLocalShortcuts(),
    next: 'Control+J',
    previous: 'Control+K',
    copy: 'Control+Return',
    tag: 'Control+G',
    delete: 'Control+D',
    deleteAlternate: 'Control+Backspace',
    focusSearch: 'Control+S',
    settings: 'Control+.',
    dismiss: 'Control+Escape',
    cancelEdit: 'Control+Escape'
  };

  expect(libraryKeyCommand(input, shortcuts)).toBeUndefined();
  expect(libraryKeyCommand({ ...input, ctrl: true }, shortcuts)).toBe('copy');
  expect(libraryKeyCommand({ ...input, key: 'j', ctrl: true, repeat: true }, shortcuts)).toBe(
    'next'
  );
  expect(libraryKeyCommand({ ...input, key: 'k', ctrl: true }, shortcuts)).toBe('previous');
  expect(libraryKeyCommand({ ...input, key: 'd', ctrl: true, focus: 'library' }, shortcuts)).toBe(
    'delete'
  );
  expect(
    libraryKeyCommand({ ...input, key: 'Backspace', ctrl: true, focus: 'library' }, shortcuts)
  ).toBe('delete');
  expect(libraryKeyCommand({ ...input, key: 's', ctrl: true }, shortcuts)).toBe('focus-search');
  expect(libraryKeyCommand({ ...input, key: '.', ctrl: true }, shortcuts)).toBe('settings');
  expect(libraryKeyCommand({ ...input, key: 'g', ctrl: true, focus: 'editor' }, shortcuts)).toBe(
    'tag'
  );
  expect(libraryKeyCommand({ ...input, key: 'Escape', ctrl: true }, shortcuts)).toBe(
    'clear-search'
  );
  expect(
    libraryKeyCommand({ ...input, key: 'Escape', ctrl: true, hasSearch: false }, shortcuts)
  ).toBe('hide');
  const typing = { ...shortcuts, tag: 'G', next: 'Space', copy: 'Shift+Return' };

  expect(libraryKeyCommand({ ...input, key: 'g', focus: 'editor' }, typing)).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: ' ' }, typing)).toBeUndefined();
  expect(libraryKeyCommand({ ...input, shift: true }, typing)).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: ' ', focus: 'library' }, typing)).toBe('next');
  expect(
    libraryKeyCommand(
      { ...input, key: 'c', ctrl: true, focus: 'editor' },
      { ...shortcuts, tag: 'Control+C' }
    )
  ).toBeUndefined();
  expect(editorCancelCommand({ ...input, key: 'Escape', ctrl: true }, shortcuts)).toBe(true);
  expect(
    editorCancelCommand({ ...input, key: 'Escape', ctrl: true, composing: true }, shortcuts)
  ).toBe(false);
  expect(editorCancelCommand({ ...input, key: 'Escape' }, shortcuts)).toBe(false);
  expect(
    libraryKeyCommand({ ...input, key: ' ', focus: 'control' }, { ...shortcuts, settings: 'Space' })
  ).toBeUndefined();
  expect(
    libraryKeyCommand({ ...input, focus: 'control' }, { ...shortcuts, tag: 'Return' })
  ).toBeUndefined();
});
