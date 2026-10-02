// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { closeSettingsFixture } from '../e2e/close-settings-fixture';
import { writeSettingsReceipt } from '../e2e/settings-receipt';

let root;
let profile;
let info;
let attachments;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'promptly-settings-receipt-'));
  profile = path.join(root, 'owned-profile');
  attachments = [];
  info = {
    outputPath: (name) => path.join(root, 'test-results', name),
    attach: async (name, attachment) => {
      attachments.push({ name, ...attachment });
    }
  };
  await mkdir(profile);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('writes uploaded receipt files before path attachment, including unsigned Mac denial', async () => {
  await writeSettingsReceipt(
    info,
    'native-login-readback',
    JSON.stringify({
      enabled: false,
      unsignedMacDenial: true
    })
  );
  const filename = info.outputPath('native-login-readback.json');

  expect(JSON.parse(await readFile(filename, 'utf8'))).toEqual({
    enabled: false,
    unsignedMacDenial: true
  });
  expect(attachments).toEqual([
    {
      name: 'native-login-readback',
      path: filename,
      contentType: 'application/json'
    }
  ]);
});

it('retains failed restoration despite startup/close failure before deleting the owned profile', async () => {
  const startup = new Error('Owned startup failed before its first window.');
  const receipt = JSON.stringify({ restorationOk: false, initial: { login: true } });

  await writeFile(path.join(profile, 'native-preferences-restored.json'), receipt);
  let failure;

  try {
    await closeSettingsFixture({
      profile,
      native: true,
      close: () => Promise.reject(startup),
      retainReceipt: (body) => writeSettingsReceipt(info, 'native-preferences-restored', body)
    });
  } catch (error) {
    failure = error;
  }

  expect(failure).toBeInstanceOf(AggregateError);
  expect(failure.errors[0]).toBe(startup);
  expect(failure.errors[1].message).toContain('restoration failed');
  expect(await readFile(info.outputPath('native-preferences-restored.json'), 'utf8')).toBe(receipt);
  expect(attachments[0].path).toBe(info.outputPath('native-preferences-restored.json'));
  await expect(stat(profile)).rejects.toMatchObject({ code: 'ENOENT' });
});
