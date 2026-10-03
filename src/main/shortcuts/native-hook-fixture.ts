import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import type { HookFrame } from '../../shared/contracts/shortcuts';
import { NativeKeyboardHook } from '../platform/keyboard/keyboard-hook';
import type { Shortcuts } from './service';

export function nativeHookFixture(shortcuts: Shortcuts) {
  const children: ChildProcessWithoutNullStreams[] = [];
  const exits: Promise<unknown>[] = [];
  const timers = new Set<{ callback: () => void; due: number }>();
  let time = 0;
  let silent = false;
  let acknowledge: () => void = () => undefined;
  const hook = new NativeKeyboardHook(
    () => {
      const child = spawn(
        process.execPath,
        [path.resolve('tests/fixtures/keyboard-transport.mjs'), ...(silent ? ['--silent'] : [])],
        { stdio: 'pipe', windowsHide: true }
      );

      children.push(child);
      exits.push(once(child, 'exit'));
      return child;
    },
    (frame) => {
      shortcuts.receive(frame);
      if (frame.kind === 'cancel') acknowledge();
    },
    (callback, delayMs) => {
      const timer = { callback, due: time + delayMs };

      timers.add(timer);
      return () => timers.delete(timer);
    }
  );

  shortcuts.attachHook(hook);
  return {
    hook,
    setSilent(value: boolean): void {
      silent = value;
    },
    advance(delayMs: number): void {
      time += delayMs;
      for (const timer of [...timers]) {
        if (timer.due > time) continue;
        timers.delete(timer);
        timer.callback();
      }
    },
    get processes(): number {
      return children.length;
    },
    get pendingDelays(): number[] {
      return [...timers].map((timer) => timer.due - time).sort((a, b) => a - b);
    },
    async send(frames: Omit<HookFrame, 'timeMs'>[]): Promise<void> {
      const delivered = new Promise<void>((resolve) => {
        acknowledge = resolve;
      });

      children.at(-1)?.stdin.write(`${JSON.stringify([...frames, { kind: 'cancel' }])}\n`);
      await delivered;
    },
    async exit(): Promise<void> {
      children.at(-1)?.stdin.end();
      await exits.at(-1);
    },
    async close(): Promise<void> {
      await hook.stop();
      await Promise.all(exits);
    }
  };
}
