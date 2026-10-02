import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { ElectronApplication } from '@playwright/test';
import { test } from '@playwright/test';
import { z } from 'zod';

import { writeWindowReceipt } from './native-window-receipt';

export async function createShortcutDriver(application: ElectronApplication) {
  const executable = test
    .info()
    .outputPath(process.platform === 'win32' ? 'shortcut-driver.exe' : 'shortcut-driver');

  await mkdir(path.dirname(executable), { recursive: true });
  if (process.platform === 'win32') {
    await promisify(execFile)(
      path.join(process.env.WINDIR ?? 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),
      [
        '/nologo',
        '/warnaserror+',
        '/target:winexe',
        '/reference:System.Windows.Forms.dll',
        '/reference:System.Drawing.dll',
        `/out:${executable}`,
        path.resolve('tests/native/keyboard/windows/ShortcutDriver.cs')
      ],
      { windowsHide: true }
    );
  } else {
    await promisify(execFile)('xcrun', [
      'swiftc',
      '-swift-version',
      '6',
      '-warnings-as-errors',
      '-parse-as-library',
      path.resolve('tests/native/keyboard/macos/ShortcutDriver.swift'),
      '-o',
      executable
    ]);
  }

  return async (action: 'open' | 'pin' | 'capture') => {
    const owned = await application.evaluate(({ BrowserWindow, app }) => {
      app.focus({ steal: true });
      const fixture = BrowserWindow.getAllWindows().find(
        (window) => window.getTitle() === 'Promptly shortcut fixture'
      );

      if (fixture === undefined) throw new Error('Owned fixture window missing');
      fixture.focus();
      const bytes = fixture.getNativeWindowHandle();

      return {
        pid: process.pid,
        handle:
          bytes.length === 8 ? bytes.readBigUInt64LE().toString() : String(bytes.readUInt32LE())
      };
    });

    try {
      const result = await promisify(execFile)(
        executable,
        process.platform === 'win32'
          ? [String(owned.pid), owned.handle, action]
          : [String(owned.pid), action],
        { windowsHide: false }
      );
      const receipt = z
        .object({
          status: z.enum(['sent', 'activationDenied', 'inputDenied']),
          ownedForeground: z.boolean(),
          keysInjected: z.boolean()
        })
        .strict()
        .parse(JSON.parse(result.stdout.trim()));

      await writeWindowReceipt(`shortcut-delivery-${action}`, receipt);
      return receipt;
    } catch (error) {
      throw new Error(
        `Owned shortcut driver failed (${error instanceof Error && 'code' in error ? String(error.code) : 'unknown'}): ${error instanceof Error && 'stderr' in error ? String(error.stderr) : ''}`,
        { cause: error }
      );
    }
  };
}
