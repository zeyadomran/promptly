import {
  defaultLocalShortcuts,
  type LocalShortcuts
} from '../../../shared/contracts/local-shortcuts';
import { editableShortcutAllowed } from '../../../shared/shortcuts/editable';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { localShortcutMatches } from '../../../shared/shortcuts/local';

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
interface KeyInput {
  key: string;
  code?: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  altGraph?: boolean;
  composing: boolean;
  prevented: boolean;
  repeat: boolean;
}
interface LibraryKeyInput extends KeyInput {
  active: boolean;
  focus: LibraryFocus;
  selected: boolean;
  hasSearch: boolean;
}

function keyEvent(input: KeyInput): ShortcutKeyEvent {
  return {
    key: input.key,
    code: input.code ?? '',
    metaKey: input.meta,
    ctrlKey: input.ctrl,
    altKey: input.alt,
    shiftKey: input.shift,
    altGraph: input.altGraph === true,
    repeat: input.repeat,
    isComposing: input.composing
  };
}

export function editorCancelCommand(input: KeyInput, shortcuts: LocalShortcuts): boolean {
  const event = keyEvent(input);

  return (
    !input.prevented &&
    !input.repeat &&
    editableShortcutAllowed(event) &&
    localShortcutMatches(shortcuts.cancelEdit, event)
  );
}

export function libraryKeyCommand(
  input: LibraryKeyInput,
  shortcuts = defaultLocalShortcuts()
): LibraryKeyCommand | undefined {
  if (!input.active || input.prevented || input.composing || input.focus === 'overlay')
    return undefined;
  const event = keyEvent(input);
  const matches = (action: keyof LocalShortcuts) => localShortcutMatches(shortcuts[action], event);

  if (input.focus === 'editor') {
    if (!input.repeat && input.selected && editableShortcutAllowed(event) && matches('tag'))
      return 'tag';
    return undefined;
  }

  if (input.focus === 'search' && !editableShortcutAllowed(event, true)) return undefined;
  if (input.focus === 'control' && !editableShortcutAllowed(event)) return undefined;
  if (!input.repeat) {
    if (matches('settings')) return 'settings';
    if (matches('dismiss')) return input.hasSearch ? 'clear-search' : 'hide';
    if (matches('focusSearch')) return 'focus-search';
    if (input.selected && matches('tag')) return 'tag';
  }

  if (input.focus === 'control') return undefined;
  if (matches('next')) return 'next';
  if (matches('previous')) return 'previous';
  if (input.repeat || !input.selected) return undefined;
  if (matches('copy')) return 'copy';
  if (input.focus !== 'search' && (matches('delete') || matches('deleteAlternate')))
    return 'delete';
  return undefined;
}
