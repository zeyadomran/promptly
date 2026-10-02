import { expect, it } from 'vitest';

import { ShortcutRecordingSession } from './recording-session';

it('records a combination only after suppression, releases before saving and cancels stale sessions', async () => {
  let suppressed = false;
  let finishStart: (() => void) | undefined;
  let signalAcquire: () => void = () => undefined;
  let acquired = new Promise<void>((resolve) => {
    signalAcquire = resolve;
  });
  const saved: string[] = [];
  const session = new ShortcutRecordingSession(async (active) => {
    suppressed = active;
    if (active) {
      const acknowledgment = new Promise<void>((resolve) => {
        finishStart = resolve;
      });

      signalAcquire();
      await acknowledgment;
    }
  });
  const commit = (value: string) => {
    expect(suppressed).toBe(false);
    saved.push(value);
    return Promise.resolve();
  };

  const key = {
    key: 's',
    code: 'KeyS',
    ctrlKey: true,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false
  };
  const first = session.start('capture', commit);

  await acquired;
  session.handleKey(key);
  expect(saved).toEqual([]);
  finishStart?.();
  await first;
  session.handleKey({ ...key, isComposing: true });
  session.handleKey({ ...key, repeat: true });
  session.handleKey({ ...key, key: 'Control', code: 'ControlLeft' });
  session.handleKey({ ...key, ctrlKey: false });
  expect(session.snapshot.phase).toBe('recording');
  session.handleKey(key);
  session.handleKey({ ...key, key: 'b', code: 'KeyB' });
  session.handleKeyUp({ ...key, ctrlKey: false });
  expect(saved).toEqual([]);
  session.handleKey(key);
  expect(saved).toEqual([]);
  expect(suppressed).toBe(true);
  session.handleKeyUp(key);
  expect(saved).toEqual([]);
  session.handleKeyUp({ ...key, ctrlKey: false });
  await session.settled();
  expect(saved).toEqual(['Control+S']);
  expect(session.snapshot.phase).toBe('idle');

  acquired = new Promise<void>((resolve) => {
    signalAcquire = resolve;
  });
  const stale = session.start('open', commit);

  await acquired;
  const cancellation = session.cancel();

  acquired = new Promise<void>((resolve) => {
    signalAcquire = resolve;
  });
  const latest = session.start('pin', commit);

  finishStart?.();
  await stale;
  await cancellation;
  await acquired;
  finishStart?.();
  await latest;
  session.handleKey({ ...key, key: 'ß', metaKey: true, altKey: true, ctrlKey: false });
  session.handleKeyUp({ ...key, ctrlKey: false });
  await session.settled();
  expect(saved).toEqual(['Control+S', 'Super+Alt+S']);
  expect(suppressed).toBe(false);

  acquired = new Promise<void>((resolve) => {
    signalAcquire = resolve;
  });
  const escape = session.start('open', commit);

  await acquired;
  finishStart?.();
  await escape;
  session.handleKey({ ...key, key: 'Escape' });
  await session.settled();
  expect(saved).toHaveLength(2);
  expect(suppressed).toBe(false);
});
