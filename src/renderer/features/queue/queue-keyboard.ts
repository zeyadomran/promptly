import type { LocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { localShortcutMatches } from '../../../shared/shortcuts/local';
import type { LibraryFocus } from '../library/library-keyboard';

export type QueueKeyCommand =
  | 'copy'
  | 'copy-return'
  | 'complete'
  | 'move-up'
  | 'move-down'
  | 'next'
  | 'previous'
  | 'delete'
  | 'hide';
export function queueKeyCommand(
  event: ShortcutKeyEvent,
  context: {
    active: boolean;
    prevented: boolean;
    focus: LibraryFocus;
    selected: boolean;
    open: boolean;
  },
  shortcuts: LocalShortcuts
): QueueKeyCommand | undefined {
  if (
    !context.active ||
    context.prevented ||
    event.isComposing ||
    context.focus === 'overlay' ||
    context.focus === 'editor'
  )
    return undefined;
  if (context.focus === 'control' || context.focus === 'search') return undefined;
  const matches = (name: keyof LocalShortcuts) => localShortcutMatches(shortcuts[name], event);

  if (!event.repeat && matches('dismiss')) return 'hide';
  if (!context.selected) return undefined;
  if (matches('next')) return 'next';
  if (matches('previous')) return 'previous';
  if (event.repeat) return undefined;
  if (matches('copy')) return 'copy';
  if (matches('copyAndReturn')) return 'copy-return';
  if (matches('queueComplete')) return 'complete';
  if (context.open && matches('moveUp')) return 'move-up';
  if (context.open && matches('moveDown')) return 'move-down';
  if (matches('delete') || matches('deleteAlternate')) return 'delete';
  return undefined;
}
