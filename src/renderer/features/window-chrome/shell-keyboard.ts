import type { LocalShortcuts } from '../../../shared/contracts/local-shortcuts';
import type { Settings } from '../../../shared/contracts/settings';
import { editableShortcutAllowed } from '../../../shared/shortcuts/editable';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { localShortcutMatches } from '../../../shared/shortcuts/local';
import type { ShellView } from './shell-navigation';

export function shellKeyView(
  input: ShortcutKeyEvent & { view: ShellView; prevented: boolean; overlay: boolean },
  shortcuts: LocalShortcuts,
  globalBindings: readonly (string | null)[] = []
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

  const wikiKey = input.key === 'F1' && plain;

  if (wikiKey && globalBindings.some((binding) => localShortcutMatches(binding, input)))
    return undefined;
  if (
    input.view !== 'library' &&
    editableShortcutAllowed(input) &&
    localShortcutMatches(shortcuts.settings, input)
  )
    return input.view === 'settings' ? 'library' : 'settings';
  if (wikiKey && wikiShortcutAvailable(shortcuts, globalBindings))
    return input.view === 'wiki' ? 'library' : 'wiki';
  if (input.view === 'library') return undefined;
  if (input.key === 'Escape' && plain) return 'library';
  return undefined;
}

const wikiKeyEvent: ShortcutKeyEvent = {
  key: 'F1',
  code: 'F1',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false
};

/** Built-in help yields to saved bindings without rewriting user preferences. */
export function wikiShortcutAvailable(
  shortcuts: LocalShortcuts,
  globalBindings: readonly (string | null)[] = []
) {
  return ![...Object.values(shortcuts), ...globalBindings].some((binding) =>
    localShortcutMatches(binding, wikiKeyEvent)
  );
}

export function shellGlobalBindings(
  settings: Pick<Settings, 'openShortcut' | 'pinShortcut' | 'saveShortcut'>
) {
  return [
    settings.openShortcut,
    settings.pinShortcut,
    settings.saveShortcut.kind === 'combination' ? settings.saveShortcut.accelerator : null
  ];
}
