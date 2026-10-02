import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'Promptly',
    extraResource: [
      path.resolve('out/tray-assets'),
      path.resolve('native/windows/out/promptly-windows.exe'),
      path.resolve('native/keyboard/windows/out/promptly-keyboard.exe')
    ]
  },
  hooks: {
    generateAssets: async (_configuration, platform, arch) => {
      if (process.platform !== 'win32' || platform !== 'win32' || arch !== 'x64')
        throw new Error('Promptly can only be packaged for Windows x64 on Windows.');
      await promisify(execFile)(process.execPath, [path.resolve('scripts/build-tray-assets.mjs')], {
        windowsHide: true
      });
      await promisify(execFile)(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          path.resolve('native/windows/build.ps1')
        ],
        { windowsHide: true }
      );
      await promisify(execFile)(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          path.resolve('native/keyboard/windows/build.ps1')
        ],
        { windowsHide: true }
      );
    }
  },
  makers: [],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: {
            main: 'src/main/main.ts',
            'storage-worker': 'src/main/storage/storage-worker.ts'
          },
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        },
        {
          entry: 'src/preload/capture-toast-preload.ts',
          config: 'vite.capture-toast-preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
        { name: 'capture_toast', config: 'vite.capture-toast.config.ts' }
      ]
    })
  ]
};

export default config;
