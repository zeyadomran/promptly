import { recordedAccelerator, type ShortcutKeyEvent } from '../../../shared/shortcuts/keyboard';

type RecordingInput =
  | { kind: 'ignore'; preview?: string }
  | { kind: 'cancel'; consume: boolean }
  | { kind: 'clear'; error?: string }
  | { kind: 'candidate'; accelerator: string };

export function recordingInput(
  event: ShortcutKeyEvent,
  scope: 'local' | 'global',
  candidate?: string
): RecordingInput {
  if (
    event.isComposing ||
    ['Dead', 'Process', 'Unidentified', 'AltGraph'].includes(event.key) ||
    event.altGraph === true
  )
    return { kind: 'clear' };
  if (
    (event.key === 'Escape' && scope === 'global') ||
    (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey)
  )
    return { kind: 'cancel', consume: event.key === 'Escape' };
  const modifier = ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key);

  if (candidate !== undefined && !event.repeat && !modifier)
    return { kind: 'clear', error: 'Record one key with modifiers, then release the keys.' };
  const accelerator = recordedAccelerator(event, scope === 'local');

  if (accelerator !== undefined) return { kind: 'candidate', accelerator };
  if (modifier) return { kind: 'ignore', preview: modifierPreview(event) };
  if (event.repeat) return { kind: 'ignore' };
  return {
    kind: 'clear',
    error:
      scope === 'local'
        ? 'Press one key or a combination. Tab, IME and AltGr text cannot be recorded.'
        : 'Press a modifier and a key. IME and AltGr text cannot be recorded.'
  };
}

export function modifierPreview(event: ShortcutKeyEvent): string {
  return [
    event.metaKey ? 'Super' : '',
    event.ctrlKey ? 'Control' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : ''
  ]
    .filter(Boolean)
    .join('+');
}
