import { acceleratorKey } from './accelerator';
import { recordedAccelerator, type ShortcutKeyEvent } from './keyboard';

export function localShortcutIdentities(binding: string): string[] {
  const alternatives = /commandorcontrol|cmdorctrl/i.test(binding)
    ? [
        binding.replace(/commandorcontrol|cmdorctrl/i, 'Control'),
        binding.replace(/commandorcontrol|cmdorctrl/i, 'Super')
      ]
    : [binding];

  return alternatives.map((value) => acceleratorKey(value, 'win32'));
}

export function localShortcutMatches(binding: string | null, event: ShortcutKeyEvent): boolean {
  if (binding === null) return false;
  const key = recordedAccelerator({ ...event, repeat: false }, true);

  if (key === undefined) return false;
  return localShortcutIdentities(binding).includes(acceleratorKey(key, 'win32'));
}

/** Ordinary text, selection, clipboard and text navigation stay owned by editable controls. */
export function editableShortcutAllowed(event: ShortcutKeyEvent, search = false): boolean {
  if (event.altGraph === true || event.isComposing) return false;
  const key = event.key.toLowerCase();

  if (key === 'escape' || /^f\d+$/.test(key)) return true;
  if (!event.ctrlKey && !event.metaKey) {
    if (event.altKey) return false;
    return search && !event.shiftKey && ['arrowup', 'arrowdown', 'enter'].includes(key);
  }

  return ![
    'a',
    'c',
    'v',
    'x',
    'z',
    'y',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    'home',
    'end',
    'pageup',
    'pagedown',
    'backspace',
    'delete',
    'insert'
  ].includes(key);
}
