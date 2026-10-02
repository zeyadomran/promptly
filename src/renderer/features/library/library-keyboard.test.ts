import { expect, it } from 'vitest';

import { libraryKeyCommand } from './library-keyboard';

it('routes library navigation and copy while preserving text, IME, and overlay ownership', () => {
  const input = {
    key: 'Enter',
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    composing: false,
    prevented: false,
    focus: 'search' as const,
    selected: true,
    hasSearch: true
  };

  expect(libraryKeyCommand(input)).toBe('copy');
  expect(libraryKeyCommand({ ...input, key: 'ArrowDown' })).toBe('next');
  expect(libraryKeyCommand({ ...input, key: 'Delete' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, focus: 'library', key: 'Delete' })).toBe('delete');
  expect(libraryKeyCommand({ ...input, selected: false })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, focus: 'editor' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, focus: 'overlay' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, composing: true })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: 'Escape' })).toBe('clear-search');
  expect(libraryKeyCommand({ ...input, key: 'Escape', hasSearch: false })).toBe('hide');
  expect(libraryKeyCommand({ ...input, key: 'f', ctrl: true, focus: 'editor' })).toBeUndefined();
  expect(libraryKeyCommand({ ...input, key: 'f', ctrl: true })).toBe('focus-search');
});
