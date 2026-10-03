export type LibraryKeyCommand =
  | 'copy'
  | 'next'
  | 'previous'
  | 'delete'
  | 'focus-search'
  | 'tag'
  | 'settings'
  | 'clear-search'
  | 'hide';
export type LibraryFocus = 'search' | 'library' | 'editor' | 'overlay' | 'control';

export function libraryKeyCommand(input: {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  composing: boolean;
  prevented: boolean;
  repeat: boolean;
  active: boolean;
  focus: LibraryFocus;
  selected: boolean;
  hasSearch: boolean;
}): LibraryKeyCommand | undefined {
  if (input.prevented || input.composing || input.focus === 'overlay') return undefined;
  if (input.alt || input.shift) return undefined;
  if (input.repeat && input.key !== 'ArrowDown' && input.key !== 'ArrowUp') return undefined;
  if (
    (input.meta || input.ctrl) &&
    input.active &&
    input.key.toLowerCase() === 't' &&
    input.selected
  )
    return 'tag';
  if (input.focus === 'editor') return undefined;
  if (input.meta || input.ctrl) {
    if (input.key === ',') return 'settings';
    if (!input.active) return undefined;
    if (input.key.toLowerCase() === 'f') return 'focus-search';
    return undefined;
  }

  if (input.key === 'Escape') return input.active && input.hasSearch ? 'clear-search' : 'hide';
  if (!input.active) return undefined;
  if (input.focus === 'control') return undefined;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'Enter' && input.selected) return 'copy';
  if (
    (input.key === 'Delete' || input.key === 'Backspace') &&
    input.selected &&
    input.focus !== 'search'
  )
    return 'delete';
  return undefined;
}
