import { expect, it } from 'vitest';

import { copyFixture } from './copy-test-fixture';

it('copies authoritative full text and Markdown with durable statistics and current hide policy', async () => {
  const clipboard: string[] = [];
  const fixture = copyFixture((copied) => {
    clipboard.push(copied);
    return Promise.resolve();
  });
  const text = '  你好😀e\u0301\r\n`````\nfull text  ';

  try {
    fixture.store.invoke('updateSnippet', { id: fixture.id, text });
    fixture.settings.alwaysOnTop = true;
    expect(await fixture.copy()).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 1 }, warnings: [] }
    });
    expect(clipboard).toEqual([text]);
    expect(fixture.visible()).toBe(true);
    fixture.settings.hideAfterCopy = 'always';
    expect(await fixture.copy('markdown')).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 2 } }
    });
    expect(clipboard).toEqual([text, `\`\`\`\`\`\`\n${text}\n\`\`\`\`\`\``]);
    expect(fixture.visible()).toBe(false);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet).toMatchObject({
      text,
      copyCount: 2,
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

it('drains an entered write after owner retirement and shutdown without replay or hiding', async () => {
  let release: () => void = () => undefined;
  let entered: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const clipboard: string[] = [];
  const fixture = copyFixture(async (text) => {
    clipboard.push(text);
    entered();
    await held;
  });

  try {
    const copying = fixture.copy();

    await ready;
    fixture.retire();
    const closing = fixture.service.close();

    expect(await fixture.copy()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    release();
    expect(await copying).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 1 }, warnings: ['WINDOW_NOT_HIDDEN'] }
    });
    await closing;
    expect(clipboard).toEqual(['stored text']);
    expect(fixture.visible()).toBe(true);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(1);
  } finally {
    release();
    await fixture.dispose();
  }
});
