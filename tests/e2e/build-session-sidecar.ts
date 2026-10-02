import { execFile } from 'node:child_process';
import { mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { build } from 'vite';

import { isHostedMacosProbe } from './carbon-hosted';

export async function buildSessionSidecar(buildDirectory: string) {
  if (!isHostedMacosProbe(process.platform, process.env))
    throw new Error('Session build requires GitHub-hosted macOS');
  await mkdir(buildDirectory, { recursive: true });
  const executable = path.join(buildDirectory, 'session-sidecar');

  await promisify(execFile)('xcrun', [
    'swiftc',
    '-swift-version',
    '5',
    '-warnings-as-errors',
    '-parse-as-library',
    path.resolve('tests/native/keyboard/macos/SessionSidecar.swift'),
    '-framework',
    'Carbon',
    '-o',
    executable
  ]);
  await build({
    configFile: false,
    build: {
      outDir: buildDirectory,
      emptyOutDir: false,
      lib: {
        entry: path.resolve('tests/e2e/fixtures/session-main.ts'),
        formats: ['cjs'],
        fileName: () => 'session-main.cjs'
      },
      rollupOptions: { external: ['electron', /^node:/] }
    }
  });
  return {
    executable: await realpath(executable),
    main: path.join(buildDirectory, 'session-main.cjs')
  };
}
