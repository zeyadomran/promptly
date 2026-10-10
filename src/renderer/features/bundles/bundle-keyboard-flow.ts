import {
  defaultLocalShortcuts,
  type LocalShortcuts
} from '../../../shared/contracts/local-shortcuts';
import type { ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';
import { bundleMoveCommand } from './bundle-keyboard';
import type { BundleModel } from './bundle-model';

export function assertConfiguredBundleKeys(
  bundle: BundleModel,
  first: string,
  second: string,
  assertOrder: (expected: string[]) => void
) {
  const key: ShortcutKeyEvent = {
    key: 'ArrowUp',
    code: 'ArrowUp',
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false
  };
  const configured = { moveUp: 'Control+Up', moveDown: 'Control+Down' };
  const admission = { pending: false, prevented: false };
  const dispatch = (
    event: ShortcutKeyEvent,
    bindings: Pick<LocalShortcuts, 'moveUp' | 'moveDown'> = configured,
    context = admission
  ) => {
    const command = bundleMoveCommand(event, context, bindings);

    if (command !== undefined) bundle.move(second, command);
  };

  dispatch(key);
  assertOrder([second, first]);
  dispatch({ ...key, key: 'ArrowDown', code: 'ArrowDown', ctrlKey: false, altKey: true });
  assertOrder([second, first]);
  const disabled = { moveUp: null, moveDown: null };
  const ignored = bundleMoveCommand(
    { ...key, key: 'ArrowDown', code: 'ArrowDown', ctrlKey: false, altKey: true },
    admission,
    disabled
  );

  if (ignored !== undefined) bundle.move(second, ignored);
  assertOrder([second, first]);
  dispatch(
    { ...key, key: 'ArrowDown', code: 'ArrowDown', ctrlKey: false, altKey: true },
    defaultLocalShortcuts()
  );
  assertOrder([first, second]);
  for (const [event, context] of [
    [key, { ...admission, pending: true }],
    [key, { ...admission, prevented: true }],
    [{ ...key, repeat: true }, admission],
    [{ ...key, isComposing: true }, admission],
    [{ ...key, altGraph: true }, admission],
    [{ ...key, key: 'Process' }, admission]
  ] as const) {
    dispatch(event, configured, context);
    assertOrder([first, second]);
  }
}
