import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

import ts from 'typescript';
import { expect, it } from 'vitest';

async function wrapper(failStartup = false) {
  const source = await readFile('tests/e2e/fixtures/storage-native-wrapper.ts', 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const order = [];
  const receipts = new Map();
  const events = new Map();
  let finish;
  const restoration = new Promise((resolve) => {
    finish = resolve;
  });
  let complete;
  const done = new Promise((resolve) => {
    complete = resolve;
  });
  const app = {
    setPath: () => undefined,
    on: (name, callback) => events.set(name, callback),
    whenReady: () => Promise.resolve(),
    getLoginItemSettings: () => ({ openAtLogin: true }),
    quit: () => {
      order.push('quit');
      complete();
    },
    exit: (code) => {
      order.push(`exit-${code}`);
      complete();
    }
  };
  const modules = {
    'node:fs': {
      writeFileSync: (filename, data) => receipts.set(path.basename(filename), JSON.parse(data))
    },
    'node:path': path,
    'node:module': {
      createRequire: () => () => {
        order.push('production-initialize');
        if (failStartup) throw new Error('Owned startup failure');
      }
    },
    electron: { app },
    './settings-native-preferences': {
      hostedNativePreferences: () => ({
        enabled: true,
        capture: () => order.push('capture'),
        restore: () => {
          order.push('restore');
          return restoration;
        }
      })
    }
  };

  vm.runInNewContext(code, {
    exports: {},
    require: (id) => modules[id],
    __dirname: 'owned/package',
    process: { platform: 'win32', env: { PROMPTLY_SETTINGS_UI_PROFILE: 'owned/profile' } }
  });
  await Promise.resolve();
  await Promise.resolve();
  return { app, order, receipts, events, finish, done };
}

it('captures before real product initialization and waits for restoration after production will-quit', async () => {
  const owned = await wrapper();

  expect(owned.order).toEqual(['capture', 'production-initialize']);
  expect(owned.receipts.get('native-transfer-initial.json')).toMatchObject({
    initial: { login: true }
  });
  let prevented = 0;

  owned.events.get('will-quit')({
    preventDefault: () => {
      prevented += 1;
    }
  });
  expect(prevented).toBe(1);
  expect(owned.order).toEqual(['capture', 'production-initialize', 'restore']);
  owned.finish();
  await owned.done;
  expect(owned.order.at(-1)).toBe('quit');
  owned.events.get('will-quit')({
    preventDefault: () => {
      prevented += 1;
    }
  });
  expect(prevented).toBe(1);
});

it('preserves startup-failure phase and waits for native restoration before fatal exit', async () => {
  const owned = await wrapper(true);

  expect(owned.order).toEqual(['capture', 'production-initialize', 'restore']);
  expect(owned.receipts.get('native-transfer-phase.json')).toEqual({
    stage: 'owned-wrapper-startup-failed'
  });
  owned.finish();
  await owned.done;
  expect(owned.order.at(-1)).toBe('exit-1');
});
