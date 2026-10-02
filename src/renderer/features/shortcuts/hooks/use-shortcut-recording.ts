import { useEffect, useState } from 'react';

import { type RecordingSnapshot, ShortcutRecordingSession } from '../recording-session';

export function useShortcutRecording() {
  const [snapshot, setSnapshot] = useState<RecordingSnapshot>({
    phase: 'idle',
    target: undefined,
    error: undefined,
    candidate: undefined
  });
  const [session] = useState(
    () =>
      new ShortcutRecordingSession(async (active) => {
        const result = await window.promptly.setShortcutRecording({ active });

        if (!result.ok) throw new Error(result.error.message);
      })
  );

  useEffect(() => {
    const unsubscribe = session.subscribe(setSnapshot);
    let composing = false;
    const compositionStart = () => {
      composing = true;
    };

    const compositionEnd = () => {
      composing = false;
    };

    const keyEvent = (event: KeyboardEvent) => {
      const input = {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        repeat: event.repeat,
        isComposing: event.isComposing || composing,
        altGraph: event.getModifierState('AltGraph')
      };

      if (event.type === 'keydown' ? session.handleKey(input) : session.handleKeyUp(input)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const cancel = () => {
      void session.cancel();
    };

    const visibility = () => {
      if (document.hidden) cancel();
    };

    window.addEventListener('keydown', keyEvent, true);
    window.addEventListener('keyup', keyEvent, true);
    window.addEventListener('compositionstart', compositionStart, true);
    window.addEventListener('compositionend', compositionEnd, true);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      unsubscribe();
      cancel();
      window.removeEventListener('keydown', keyEvent, true);
      window.removeEventListener('keyup', keyEvent, true);
      window.removeEventListener('compositionstart', compositionStart, true);
      window.removeEventListener('compositionend', compositionEnd, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [session]);
  return { session, snapshot };
}
