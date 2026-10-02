import { EventEmitter } from 'node:events';

import type { BrowserWindow } from 'electron';
import { afterEach, expect, it, vi } from 'vitest';

import { loadWindowRenderer } from './load-window-renderer';

afterEach(() => {
  vi.useRealTimers();
});

function fixture() {
  const contents = new EventEmitter();
  let load: (() => void) | undefined;
  let fail: ((error: Error) => void) | undefined;
  const window = Object.assign(new EventEmitter(), {
    webContents: contents,
    loadURL: () =>
      new Promise<void>((resolve, reject) => {
        load = resolve;
        fail = reject;
      })
  });

  return {
    window,
    contents,
    open: () => loadWindowRenderer(window as unknown as BrowserWindow, 'file:///owned', 100),
    load: () => load?.(),
    fail: () => fail?.(new Error('Owned load rejected.'))
  };
}

it.each(['load-first', 'ready-first'] as const)(
  'cleans listeners and deadline on successful %s ordering',
  async (order) => {
    vi.useFakeTimers();
    const owned = fixture();
    const opening = owned.open();
    const settled = vi.fn();

    void opening.then(settled);
    if (order === 'load-first') owned.load();
    else owned.window.emit('ready-to-show');
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    if (order === 'load-first') owned.window.emit('ready-to-show');
    else owned.load();
    await opening;
    expect(owned.window.eventNames()).toEqual([]);
    expect(owned.contents.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  }
);

it.each(['closed', 'destroyed', 'render-process-gone', 'timeout'] as const)(
  'rejects %s even after readiness while loading remains pending, without leaking listeners or late rejection',
  async (failure) => {
    vi.useFakeTimers();
    const owned = fixture();
    const opening = owned.open();
    const rejected = expect(opening).rejects.toThrow();

    owned.window.emit('ready-to-show');
    if (failure === 'closed') owned.window.emit('closed');
    else if (failure === 'timeout') await vi.advanceTimersByTimeAsync(100);
    else owned.contents.emit(failure);
    await rejected;
    expect(owned.window.eventNames()).toEqual([]);
    expect(owned.contents.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    owned.fail();
    await Promise.resolve();
  }
);
