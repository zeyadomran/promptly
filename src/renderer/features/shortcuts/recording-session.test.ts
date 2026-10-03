import { expect, it } from 'vitest';

import { ShortcutRecordingSession } from './recording-session';

it('records a combination only after suppression, releases before saving and cancels stale sessions', async () => {
  let suppressed = false;
  let deferAcquire = true;
  let finishStart: (() => void) | undefined;
  let signalAcquire: () => void = () => undefined;
  let acquired = new Promise<void>((resolve) => {
    signalAcquire = resolve;
  });
  const saved: string[] = [];
  const session = new ShortcutRecordingSession(async (active) => {
    suppressed = active;
    if (active && deferAcquire) {
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
  expect(session.snapshot).toMatchObject({ preview: 'Control', candidate: undefined });
  session.handleKey({ ...key, ctrlKey: false });
  expect(session.snapshot.phase).toBe('recording');
  session.handleKey(key);
  session.handleKey({ ...key, key: 'b', code: 'KeyB' });
  session.handleKeyUp({ ...key, ctrlKey: false });
  expect(saved).toEqual([]);
  session.handleKey(key);
  expect(saved).toEqual([]);
  expect(suppressed).toBe(true);
  session.handleKeyUp({ ...key, key: 'Control', code: 'ControlLeft', ctrlKey: false });
  await session.settled();
  expect(saved).toEqual([]);
  expect(suppressed).toBe(true);
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

  deferAcquire = false;
  await session.start('capture', commit);
  session.handleKey({ ...key, key: 'm', code: 'Semicolon' });
  session.handleKeyUp({ ...key, key: 'm', code: 'Semicolon', ctrlKey: false });
  await session.settled();
  expect(saved).toEqual(['Control+S', 'Super+Alt+S', 'Control+M']);

  await session.start('capture', commit);
  session.handleKey({ ...key, key: ';', code: 'KeyM' });
  session.handleKeyUp({ ...key, key: ';', code: 'KeyM', ctrlKey: false });
  await session.settled();
  expect(saved.at(-1)).toBe('Control+;');

  await session.start('pin', commit);
  session.handleKey({ ...key, key: '1', code: 'Numpad1' });
  session.handleKeyUp({ ...key, key: '1', code: 'Numpad1', ctrlKey: false });
  await session.settled();
  expect(saved.at(-1)).toBe('Control+num1');

  await session.start('open', commit);
  session.handleKey({ ...key, key: 'Escape' });
  await session.settled();
  expect(saved).toHaveLength(5);
  expect(suppressed).toBe(false);
  await session.start('dismiss', commit, 'local');
  session.handleKey({ ...key, key: 'Escape', code: 'Escape', ctrlKey: false });
  session.handleKeyUp({ ...key, key: 'Escape', code: 'Escape', ctrlKey: false });
  await session.settled();
  expect(saved.at(-1)).toBe('ESCAPE');
  await session.start('next', commit, 'local');
  session.handleKey({ ...key, key: 'ArrowDown', code: 'ArrowDown', ctrlKey: false });
  session.handleKeyUp({ ...key, key: 'ArrowDown', code: 'ArrowDown', ctrlKey: false });
  await session.settled();
  expect(saved.at(-1)).toBe('Down');
  const collision = { action: 'focusSearch', label: 'Focus search', swapAllowed: true } as const;

  await session.start('tag', commit, 'local', () => ({ kind: 'conflict', collision }));
  session.handleKey({ ...key, key: 'f', code: 'KeyF' });
  expect(session.snapshot.collision).toEqual(collision);
  expect(suppressed).toBe(true);
  session.handleKeyUp({ ...key, key: 'f', code: 'KeyF', ctrlKey: false });
  await session.settled();
  expect(session.snapshot).toMatchObject({ phase: 'conflict', candidate: 'Control+F', collision });
  expect(suppressed).toBe(false);
  expect(saved.at(-1)).toBe('Down');
  await session.resolveConflict(() => {
    expect(suppressed).toBe(false);
    saved.push('Swapped once');
    return Promise.resolve();
  });
  expect(session.snapshot.phase).toBe('idle');
  expect(saved.at(-1)).toBe('Swapped once');
  await session.start('tag', commit, 'local', () => ({ kind: 'conflict', collision }));
  session.handleKey({ ...key, key: 'f', code: 'KeyF' });
  session.handleKeyUp({ ...key, key: 'f', code: 'KeyF', ctrlKey: false });
  await session.settled();
  const savedBeforeCancel = [...saved];
  const cancelledSwap = session.resolveConflict(() => {
    saved.push('Cancelled swap');
    return Promise.resolve();
  });

  await session.cancel();
  await cancelledSwap;
  expect(saved).toEqual(savedBeforeCancel);
  expect(session.snapshot.phase).toBe('idle');
  expect(suppressed).toBe(false);
  await session.cancel();
  await session.start('next', commit, 'local');
  expect(session.handleKey({ ...key, key: 'Tab', code: 'Tab', ctrlKey: false })).toBe(false);
  await session.settled();
  expect(session.snapshot.phase).toBe('idle');
  await session.start('next', commit, 'local');
  await session.cancel();
  expect(session.snapshot.phase).toBe('idle');
  expect(suppressed).toBe(false);
});
