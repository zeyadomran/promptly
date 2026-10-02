import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'Promptly',
    extraResource:
      process.platform === 'win32' ? [path.resolve('native/windows/out/promptly-windows.exe')] : []
  },
  hooks: {
    generateAssets: async () => {
      if (process.platform === 'win32') {
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
      }
    }
  },
  makers: [],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }]
    })
  ]
};

export default config;
