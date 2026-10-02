import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: { asar: true, executableName: 'Promptly' },
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
        }
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }]
    })
  ]
};

export default config;
