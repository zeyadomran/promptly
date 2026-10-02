import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

import {
  keyboardExecutable,
  launchKeyboard,
  NativeKeyboardHook
} from '../../src/main/platform/keyboard/keyboard-hook';
import { hookFrameSchema } from '../../src/shared/contracts/shortcuts';

test('native physical modifier decoder preserves eight sides, overlap, repeats and sanitized cancellation', async () => {
  const executable = test
    .info()
    .outputPath(process.platform === 'win32' ? 'keyboard-fixture.exe' : 'keyboard-fixture');

  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(path.dirname(executable), { recursive: true })
  );
  if (process.platform === 'win32') {
    await promisify(execFile)(
      path.join(process.env.WINDIR ?? 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),
      [
        '/nologo',
        '/warnaserror+',
        '/target:exe',
        `/out:${executable}`,
        path.resolve('native/keyboard/windows/KeyboardEvents.cs'),
        path.resolve('native/keyboard/windows/EventQueue.cs'),
        path.resolve('tests/native/keyboard/windows/Fixture.cs')
      ],
      { windowsHide: true }
    );
  } else {
    await promisify(execFile)('xcrun', [
      'swiftc',
      '-swift-version',
      '6',
      '-warnings-as-errors',
      '-O',
      path.resolve('native/keyboard/macos/PhysicalModifiers.swift'),
      path.resolve('tests/native/keyboard/macos/Fixture.swift'),
      '-o',
      executable
    ]);
  }

  const { stdout } = await promisify(execFile)(executable, [], { windowsHide: true });
  const frames = stdout
    .trim()
    .split('\n')
    .slice(0, 24)
    .map((line) => hookFrameSchema.parse(JSON.parse(line) as unknown));

  expect(
    frames.slice(0, 16).map((frame) => (frame.kind === 'modifiers' ? frame.mask : null))
  ).toEqual([1, 0, 2, 0, 4, 0, 8, 0, 16, 0, 32, 0, 64, 0, 128, 0]);
  expect(
    frames.slice(16, 20).map((frame) => (frame.kind === 'modifiers' ? frame.mask : null))
  ).toEqual([1, 3, 2, 0]);
  expect(frames[21]).toMatchObject({ kind: 'modifiers', repeat: true });
  expect(frames.slice(22)).toMatchObject([{ kind: 'cancel' }, { kind: 'cancel' }]);
  if (process.platform === 'win32')
    expect(JSON.parse(stdout.trim().split('\n')[24] ?? '') as unknown).toMatchObject({
      backpressure: true
    });
});

test('packaged passive helper reports actual installation and releases its owned native session', async () => {
  const resources = path.resolve(
    'out',
    `Promptly-${process.platform}-${process.arch}`,
    process.platform === 'darwin' ? 'Promptly.app/Contents/Resources' : 'resources'
  );
  const hook = new NativeKeyboardHook(
    () => launchKeyboard(keyboardExecutable(resources, process.cwd(), true, process.platform)),
    () => undefined
  );

  try {
    await hook.start();
    expect(hook.health.installed).toBe(true);
    if (process.platform === 'darwin') expect(hook.health.inputMonitoring).toBe(true);
    await hook.stop();
    expect(hook.health.installed).toBe(false);
    await hook.start();
    expect(hook.health.installed).toBe(true);
  } finally {
    await hook.stop();
  }
});
