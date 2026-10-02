import { acceleratorSchema } from '../contracts/accelerator';

export interface ShortcutKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  altGraph?: boolean;
}

const namedKeys = new Map([
  [' ', 'Space'],
  ['Enter', 'Return'],
  ['ArrowUp', 'Up'],
  ['ArrowDown', 'Down'],
  ['ArrowLeft', 'Left'],
  ['ArrowRight', 'Right'],
  ['+', 'Plus']
]);
const punctuation = new Map([
  ['Semicolon', ';'],
  ['Equal', '='],
  ['Comma', ','],
  ['Minus', '-'],
  ['Period', '.'],
  ['Slash', '/'],
  ['Backquote', '`'],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
  ['Backslash', '\\']
]);

export function recordedAccelerator(event: ShortcutKeyEvent): string | undefined {
  if (
    event.repeat ||
    event.isComposing ||
    event.altGraph === true ||
    ['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'Dead', 'Process', 'Unidentified'].includes(
      event.key
    )
  )
    return undefined;
  const modifiers = [
    event.metaKey ? 'Super' : '',
    event.ctrlKey ? 'Control' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : ''
  ].filter(Boolean);
  // Modified characters (Option+S, Shift+1) need the base key, not the produced text.
  const key = /^Key[A-Z]$/.test(event.code)
    ? /^[a-z]$/i.test(event.key)
      ? event.key.toUpperCase()
      : event.code.slice(3)
    : /^Digit[0-9]$/.test(event.code)
      ? event.code.slice(5)
      : (punctuation.get(event.code) ?? namedKeys.get(event.key) ?? event.key);
  const accelerator = [...modifiers, key].join('+');

  return acceleratorSchema.safeParse(accelerator).success ? accelerator : undefined;
}
