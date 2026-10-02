import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { IpcMainInvokeEvent } from 'electron';
import { app, BrowserWindow, ipcMain } from 'electron';

import { installDesktopIpc } from '../../../src/main/ipc/install-desktop-ipc';
import { createMainWindow } from '../../../src/main/windows/create-main-window';
import type { Snippet } from '../../../src/shared/contracts/domain';
import type { DesktopOperations } from '../../../src/shared/contracts/operations';
import type { HarnessGlobal } from './harness-types';

const url = pathToFileURL(path.resolve('.vite/ipc-fixture/index.html')).href;
let revision = 0;
let snippet: Snippet = {
  id: '00000000-0000-4000-8000-000000000001',
  text: 'Initial fixture snippet',
  createdAt: '2026-10-02T04:00:00.000Z',
  updatedAt: '2026-10-02T04:00:00.000Z',
  sourceApp: null,
  sourceAppId: null,
  tags: [],
  lastCopiedAt: null,
  copyCount: 0
};
// Explicit test services; the production executable never installs an in-memory library.
const services: Partial<DesktopOperations> = {
  searchSnippets: () =>
    Promise.resolve({
      ok: true,
      value: { revision, items: [snippet], total: 1, offset: 0, hasMore: false }
    }),
  createSnippet: (request) => {
    snippet = { ...snippet, text: request.text };
    revision += 1;
    desktop.publish({ revision, domains: ['snippets'] });
    return Promise.resolve({ ok: true, value: { revision, snippet } });
  }
};
const desktop = installDesktopIpc(ipcMain, services);

void app.whenReady().then(async () => {
  const first = await createMainWindow(desktop.windows);

  await createMainWindow(desktop.windows);
  (globalThis as unknown as HarnessGlobal).p02Harness = {
    subscriberCount: () => desktop.windows.subscriberCount,
    openUntrusted: async () => {
      const window = new BrowserWindow({
        webPreferences: {
          preload: path.resolve('.vite/build/preload.cjs'),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      await window.loadURL(url);
    },
    rejectChildFrame: () => {
      const child = first.webContents.mainFrame.frames[0];

      if (child === undefined) throw new Error('Fixture child frame is missing.');
      return !desktop.windows.isAuthorized({
        sender: first.webContents,
        senderFrame: child
      } as IpcMainInvokeEvent);
    }
  };
});
app.on('window-all-closed', () => {
  app.quit();
});
