import { acceleratorKey } from './accelerator';
import type { ShortcutKeyEvent } from './keyboard';

type EditableKey = Pick<
  ShortcutKeyEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'altGraph' | 'isComposing'
>;

/** Ordinary text, selection, clipboard and text navigation stay owned by editable controls. */
export function editableShortcutAllowed(event: EditableKey, search = false): boolean {
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

/** Editor-only commands must have a binding that can work without stealing native editing. */
export function editableBindingAllowed(binding: string): boolean {
  const parts = acceleratorKey(binding, 'win32').split('+');
  const key = parts.pop() ?? '';
  const names: Record<string, string> = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    return: 'Enter'
  };

  return editableShortcutAllowed({
    key: names[key] ?? key,
    ctrlKey: parts.includes('control'),
    metaKey: parts.includes('super'),
    altKey: parts.includes('alt'),
    shiftKey: parts.includes('shift'),
    isComposing: false
  });
}
