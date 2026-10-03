import path from 'node:path';

import { app, BrowserWindow, dialog, shell, webContents } from 'electron';

import type { TransferOwner } from './requests';

export interface TransferDialogs {
  directory: string;
  protectedFiles: readonly string[];
  owner: (id: number) => TransferOwner | undefined;
  save: (owner: TransferOwner, format: 'json' | 'markdown') => Promise<string | undefined>;
  open: (owner: TransferOwner) => Promise<string | undefined>;
  reveal: () => void;
}

function parent(owner: TransferOwner) {
  if (!owner.isAlive()) throw new Error('Originating renderer retired.');
  const contents = webContents.fromId(owner.id);
  const window = contents === undefined ? null : BrowserWindow.fromWebContents(contents);

  if (window === null || window.isDestroyed()) throw new Error('Originating window closed.');
  return window;
}

export function desktopTransferDialogs(): TransferDialogs {
  const directory = app.getPath('userData');

  return nativeTransferDialogs(directory, path.join(directory, 'promptly.sqlite'));
}

export function nativeTransferDialogs(directory: string, databaseFile: string): TransferDialogs {
  return {
    directory,
    protectedFiles: [databaseFile, `${databaseFile}-wal`, `${databaseFile}-shm`],
    owner: (id) => {
      const contents = webContents.fromId(id);
      const window = contents === undefined ? null : BrowserWindow.fromWebContents(contents);

      if (
        contents === undefined ||
        contents.isDestroyed() ||
        window === null ||
        window.isDestroyed()
      )
        return undefined;
      let alive = true;

      return {
        id,
        isAlive: () => alive && !contents.isDestroyed() && !window.isDestroyed(),
        onClose: (listener) => {
          const retire = () => {
            alive = false;
            listener();
          };

          const navigate = (
            _event: Electron.Event,
            _url: string,
            _inPlace: boolean,
            main: boolean
          ) => {
            if (main) retire();
          };

          contents.once('destroyed', retire);
          contents.once('render-process-gone', retire);
          contents.on('did-start-navigation', navigate);
          return () => {
            contents.removeListener('destroyed', retire);
            contents.removeListener('render-process-gone', retire);
            contents.removeListener('did-start-navigation', navigate);
          };
        }
      };
    },
    save: async (owner, format) => {
      const extension = format === 'json' ? 'jsonl' : 'md';
      const result = await dialog.showSaveDialog(parent(owner), {
        title: 'Export Promptly library',
        defaultPath: `promptly-library.${extension}`,
        filters: [
          { name: format === 'json' ? 'Promptly JSON backup' : 'Markdown', extensions: [extension] }
        ],
        properties: ['dontAddToRecent'],
        showsTagField: false
      });

      return result.canceled ? undefined : result.filePath;
    },
    open: async (owner) => {
      const result = await dialog.showOpenDialog(parent(owner), {
        title: 'Import Promptly JSON backup',
        filters: [{ name: 'Promptly JSON backup', extensions: ['jsonl', 'json'] }],
        properties: ['openFile', 'dontAddToRecent']
      });

      return result.canceled ? undefined : result.filePaths[0];
    },
    reveal: () => {
      shell.showItemInFolder(databaseFile);
    }
  };
}
