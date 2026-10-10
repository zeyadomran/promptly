import type { LocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { localShortcutMatches } from '../../../shared/shortcuts/local';

export function bundleMoveCommand(
  event: ShortcutKeyEvent,
  context: { pending: boolean; prevented: boolean },
  shortcuts: Pick<LocalShortcuts, 'moveUp' | 'moveDown'>
): -1 | 1 | undefined {
  if (
    context.pending ||
    context.prevented ||
    event.repeat ||
    event.isComposing ||
    event.key === 'Process'
  )
    return undefined;
  if (localShortcutMatches(shortcuts.moveUp, event)) return -1;
  if (localShortcutMatches(shortcuts.moveDown, event)) return 1;
  return undefined;
}
