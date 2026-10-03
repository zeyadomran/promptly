import type { LocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import { editableShortcutAllowed } from '../../../shared/shortcuts/editable';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { localShortcutMatches } from '../../../shared/shortcuts/local';
import type { ShellView } from './shell-navigation';

export function shellKeyView(
  input: ShortcutKeyEvent & { view: ShellView; prevented: boolean; overlay: boolean },
  shortcuts: LocalShortcuts
): ShellView | undefined {
  if (
    input.prevented ||
    input.overlay ||
    input.repeat ||
    input.isComposing ||
    input.key === 'Process'
  )
    return undefined;
  const plain = !input.ctrlKey && !input.metaKey && !input.altKey && !input.shiftKey;

  if (input.key === 'F1' && plain) return input.view === 'wiki' ? 'library' : 'wiki';
  if (input.view === 'library') return undefined;
  if (input.key === 'Escape' && plain) return 'library';
  if (editableShortcutAllowed(input) && localShortcutMatches(shortcuts.settings, input))
    return input.view === 'settings' ? 'library' : 'settings';
  return undefined;
}
