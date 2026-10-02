import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'Promptly',
    icon: path.resolve('out/brand-assets/promptly.ico'),
    extraResource: [
      path.resolve('out/build-provenance.json'),
      path.resolve('out/third-party-notices'),
      path.resolve('out/tray-assets'),
      path.resolve('native/windows/out/promptly-windows.exe'),
      path.resolve('native/keyboard/windows/out/promptly-keyboard.exe')
    ]
  },
  hooks: {
    generateAssets: async (_configuration, platform, arch) => {
      if (process.platform !== 'win32' || platform !== 'win32' || arch !== 'x64')
        throw new Error('Promptly can only be packaged for Windows x64 on Windows.');
      for (const script of ['build-provenance.mjs', 'build-brand-assets.mjs', 'build-notices.mjs'])
        await promisify(execFile)(process.execPath, [path.resolve('scripts', script)], {
          windowsHide: true
        });
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
    },
    postMake: async () => {
      await promisify(execFile)(
        process.execPath,
        [path.resolve('scripts/finalize-installer.mjs')],
        {
          windowsHide: true
        }
      );
    }
  },
  makers: [
    new MakerSquirrel({
      name: 'Promptly',
      authors: 'Zeyad Omran',
      description: 'Promptly — unsigned Windows x64 development build',
      setupExe: 'Promptly-unsigned-dev-x64-Setup.exe',
      setupIcon: path.resolve('out/brand-assets/promptly.ico'),
      nuspecTemplate: path.resolve('packaging/Promptly.nuspectemplate'),
      noMsi: true,
      noDelta: true
    })
  ],
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
