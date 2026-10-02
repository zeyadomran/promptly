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
const numpadKeys = new Map([
  ['NumpadDecimal', 'numdec'],
  ['NumpadAdd', 'numadd'],
  ['NumpadSubtract', 'numsub'],
  ['NumpadMultiply', 'nummult'],
  ['NumpadDivide', 'numdiv']
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
  // Layout-resolved characters win over US physical key positions. Numpad keys
  // have distinct supported accelerator names even when their glyphs match.
  const key = /^Numpad[0-9]$/.test(event.code)
    ? `num${event.code.slice(6)}`
    : (numpadKeys.get(event.code) ?? namedKeys.get(event.key) ?? event.key.toUpperCase());
  let accelerator = [...modifiers, key].join('+');

  // Alt-modified input can produce an unsupported glyph. Only fall back for an unsupported
  // modified character on a letter key; never substitute a punctuation position.
  if (
    !acceleratorSchema.safeParse(accelerator).success &&
    event.altKey &&
    /^Key[A-Z]$/.test(event.code)
  )
    accelerator = [...modifiers, event.code.slice(3)].join('+');

  return acceleratorSchema.safeParse(accelerator).success ? accelerator : undefined;
}
