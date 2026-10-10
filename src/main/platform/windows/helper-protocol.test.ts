import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, it } from 'vitest';

import {
  nativeForegroundSchema,
  nativeReadySchema
} from '../../../shared/contracts/native-selection';
import { NativeProcess } from '../native/native-process';

it.skipIf(process.platform !== 'win32')(
  'admits own-process exclusion and bounded foreground snapshots through the Windows helper protocol',
  async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'promptly-helper-protocol-'));
    const executable = path.join(directory, 'promptly-windows.exe');
    const framework = path.join(
      process.env['WINDIR'] ?? 'C:/Windows',
      'Microsoft.NET/Framework64/v4.0.30319'
    );
    let transport: NativeProcess | undefined;
    let exited: Promise<unknown> | undefined;

    try {
      const source = path.resolve('native/windows');
      const files = (await readdir(source)).filter((file) => file.endsWith('.cs'));

      await promisify(execFile)(
        path.join(framework, 'csc.exe'),
        [
          '/nologo',
          '/warnaserror+',
          '/target:exe',
          '/platform:anycpu',
          `/out:${executable}`,
          ...[
            'System.Web.Extensions.dll',
            'WPF/UIAutomationClient.dll',
            'WPF/UIAutomationTypes.dll',
            'WPF/WindowsBase.dll'
          ].map((reference) => `/reference:${path.join(framework, reference)}`),
          ...files.map((file) => path.join(source, file))
        ],
        { windowsHide: true }
      );
      const child = spawn(executable, [], { stdio: 'pipe', windowsHide: true });

      exited = once(child, 'exit');
      const protocol = new NativeProcess({ launch: () => child });

      transport = protocol;
      await protocol.request(
        'capabilities',
        { excludePid: process.pid },
        (value) => nativeReadySchema.parse(value),
        5000
      );
      const foreground = (payload: object) =>
        protocol.request(
          'foreground',
          payload,
          (value) => nativeForegroundSchema.parse(value),
          5000
        );

      // Protocol admission only: no selection text, window activation or clipboard effect.
      expect(['ok', 'foregroundChanged', 'permissionDenied']).toContain(
        (await foreground({ excludePid: process.pid })).status
      );
      expect((await foreground({ excludePid: process.pid, unexpected: true })).status).toBe(
        'invalidRequest'
      );
      expect((await foreground({ excludePid: 0 })).status).toBe('invalidRequest');
      const snapshot = (payload: object) =>
        protocol.request(
          'activationTarget',
          payload,
          (value) => nativeForegroundSchema.parse(value),
          5000
        );

      expect(['ok', 'foregroundChanged']).toContain(
        (await snapshot({ excludePid: process.pid })).status
      );
      expect((await snapshot({ excludePid: process.pid, unexpected: true })).status).toBe(
        'invalidRequest'
      );
      expect((await snapshot({ excludePid: process.pid + 1 })).status).toBe('invalidRequest');
    } finally {
      await transport?.dispose();
      await exited;
      await rm(directory, { recursive: true, force: true });
    }
  },
  15_000
);
