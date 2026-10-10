import { expect, it } from 'vitest';

import { copyFixture } from './copy-test-fixture';
import { MainCopyOwner } from './main-owner';
import { assertPreparedCopyTurn } from './prepared-copy-flow';

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
    const second = fixture.store.invoke('createSnippet', {
      text: 'second authoritative text'
    }).snippet;

    expect(
      await fixture.service.executePrepared({ senderId: 1 }, () =>
        Promise.resolve({
          ok: true,
          value: {
            text: 'Resolved bundle',
            sourceIds: [
              { kind: 'snippet', id: fixture.id },
              { kind: 'snippet', id: second.id }
            ],
            format: 'text',
            return: false,
            attachmentCount: 2
          }
        })
      )
    ).toMatchObject({
      ok: true,
      value: {
        sourceIds: [
          { kind: 'snippet', id: fixture.id },
          { kind: 'snippet', id: second.id }
        ],
        returned: 'not-requested',
        attachmentCount: 2,
        statistics: [{ copyCount: 4 }, { copyCount: 1 }]
      }
    });
    expect(clipboard.at(-1)).toBe('Resolved bundle');
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: second.id }).snippet.copyCount).toBe(1);
    await assertPreparedCopyTurn(fixture);
    expect(clipboard.at(-1)).toBe('Authoritative after queued edit');
    fixture.store.invoke('updateSnippet', { id: fixture.id, text: 'Hello {{name}}' });
    expect(await fixture.copy()).toMatchObject({
      ok: false,
      error: { code: 'TEMPLATE_REQUIRES_PREPARATION' }
    });
    expect(clipboard.at(-1)).toBe('Authoritative after queued edit');
    fixture.settings.promptVariables = false;
    expect(await fixture.copy()).toMatchObject({ ok: true });
    expect(clipboard.at(-1)).toBe('Hello {{name}}');
  } finally {
    await fixture.dispose();
  }
});
