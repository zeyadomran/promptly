import type { KeyboardEvent } from 'react';

export function draftKeyCommand(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.nativeEvent.isComposing ||
    event.key === 'Process' ||
    event.altKey ||
    event.metaKey ||
    event.getModifierState('AltGraph')
  )
    return undefined;
  if (event.ctrlKey && event.key === 'Enter') return event.shiftKey ? 'save-return' : 'save';
  if (!event.ctrlKey && !event.shiftKey && event.key === 'Escape') return 'close';
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') return 'paste';
  return undefined;
}
