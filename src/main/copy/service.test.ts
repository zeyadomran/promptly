import { expect, it } from 'vitest';

import { copyFixture } from './copy-test-fixture';
import { MainCopyOwner } from './main-owner';

it('copies authoritative full text and Markdown with durable statistics while keeping legacy profiles open', async () => {
  const clipboard: string[] = [];
  const fixture = copyFixture((copied) => {
    clipboard.push(copied);
    return Promise.resolve();
  });
  const text = '  你好😀e\u0301\r\n`````\nfull text  ';

  try {
    fixture.store.invoke('updateSnippet', { id: fixture.id, text });
    fixture.settings.alwaysOnTop = false;
    fixture.settings.hideAfterCopy = 'automatic';
    fixture.store.invoke('updateSettings', { hideAfterCopy: 'automatic', alwaysOnTop: false });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {}).settings.hideAfterCopy).toBe('automatic');
    expect(await fixture.copy()).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 1 }, warnings: [] }
    });
    expect(clipboard).toEqual([text]);
    expect(fixture.visible()).toBe(true);
    const main = new MainCopyOwner();

    fixture.settings.hideAfterCopy = 'always';
    fixture.store.invoke('updateSettings', { hideAfterCopy: 'always' });
    expect(
      await fixture.service.copyFromMain({ id: fixture.id, format: 'text' }, main)
    ).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 2 }, warnings: [] }
    });
    expect(fixture.visible()).toBe(true);
    main.close();
    expect(
      await fixture.service.copyFromMain({ id: fixture.id, format: 'text' }, main)
    ).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' }
    });
    expect(
      await fixture.service.services.copySnippet({ id: fixture.id, format: 'text' })
    ).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' }
    });
    fixture.settings.hideAfterCopy = 'always';
    expect(await fixture.copy('markdown')).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 3 } }
    });
    expect(clipboard).toEqual([text, text, `\`\`\`\`\`\`\n${text}\n\`\`\`\`\`\``]);
    expect(fixture.visible()).toBe(true);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSettings', {}).settings.hideAfterCopy).toBe('always');
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet).toMatchObject({
      text,
      copyCount: 3,
      lastCopiedAt: '2026-10-02T10:00:00.000Z'
    });
  } finally {
    await fixture.dispose();
  }
});

it('leaves statistics and visibility unchanged when the external clipboard rejects', async () => {
  const fixture = copyFixture(() => Promise.reject(new Error('Owned clipboard unavailable')));

  try {
    expect(await fixture.copy()).toMatchObject({ ok: false });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(0);
    expect(fixture.visible()).toBe(true);
  } finally {
    await fixture.dispose();
  }
});

it('reports confirmed copy with a statistics warning when SQLite rejects persistence', async () => {
  const clipboard: string[] = [];
  const fixture = copyFixture((text) => {
    clipboard.push(text);
    return Promise.resolve();
  });

  try {
    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_copy BEFORE UPDATE OF copyCount ON snippets BEGIN SELECT RAISE(ABORT, 'Owned persistence failure'); END"
    );
    expect(await fixture.copy()).toMatchObject({
      ok: true,
      value: { status: 'copied', warnings: ['STATISTICS_UNCONFIRMED'] }
    });
    expect(clipboard).toEqual(['stored text']);
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(0);
  } finally {
    await fixture.dispose();
  }
});

it('drains renderer and main-owned writes after retirement without replay or unrelated hiding', async () => {
  let release: () => void = () => undefined;
  let entered: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let releaseMain: () => void = () => undefined;
  let enteredMain: () => void = () => undefined;
  const mainReady = new Promise<void>((resolve) => {
    enteredMain = resolve;
  });
  const mainHeld = new Promise<void>((resolve) => {
    releaseMain = resolve;
  });
  const clipboard: string[] = [];
  const fixture = copyFixture(async (text) => {
    clipboard.push(text);
    if (clipboard.length === 1) {
      entered();
      await held;
    } else {
      enteredMain();
      await mainHeld;
    }
  });
  const main = new MainCopyOwner();

  try {
    const copying = fixture.copy();

    await ready;
    const mainCopy = fixture.service.copyFromMain({ id: fixture.id, format: 'text' }, main);

    fixture.retire();
    release();
    expect(await copying).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 1 }, warnings: [] }
    });
    await mainReady;
    main.close();
    const closing = fixture.service.close();

    expect(await fixture.copy()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    releaseMain();
    expect(await mainCopy).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 2 }, warnings: [] }
    });
    await closing;
    expect(clipboard).toEqual(['stored text', 'stored text']);
    expect(fixture.visible()).toBe(true);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(2);
  } finally {
    release();
    releaseMain();
    main.close();
    await fixture.dispose();
  }
});
