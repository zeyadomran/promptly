import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { isHostedMacosProbe } from './carbon-hosted';

const execute = promisify(execFile);

export async function buildCarbonControl(buildDirectory: string) {
  if (!isHostedMacosProbe(process.platform, process.env))
    throw new Error('Carbon build requires GitHub-hosted macOS');
  const bundle = path.join(buildDirectory, 'CarbonControl.app');
  const executable = path.join(bundle, 'Contents/MacOS/carbon-control');
  const driver = path.join(buildDirectory, 'carbon-shortcut-driver');

  await mkdir(path.dirname(executable), { recursive: true });
  await execute('xcrun', [
    'swiftc',
    '-swift-version',
    '5',
    '-warnings-as-errors',
    '-parse-as-library',
    path.resolve('tests/native/keyboard/macos/CarbonControl.swift'),
    path.resolve('tests/native/keyboard/macos/CarbonObservations.swift'),
    '-framework',
    'AppKit',
    '-framework',
    'Carbon',
    '-o',
    executable
  ]);
  await execute('xcrun', [
    'swiftc',
    '-swift-version',
    '6',
    '-warnings-as-errors',
    '-parse-as-library',
    path.resolve('tests/native/keyboard/macos/ShortcutDriver.swift'),
    '-o',
    driver
  ]);
  await writeFile(
    path.join(bundle, 'Contents/Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict><key>CFBundleExecutable</key><string>carbon-control</string>
<key>CFBundleIdentifier</key><string>dev.promptly.owned-carbon-control</string>
<key>CFBundlePackageType</key><string>APPL</string><key>CFBundleName</key>
<string>Promptly owned Carbon control</string></dict></plist>`
  );
  return { bundle, executable, driver };
}
