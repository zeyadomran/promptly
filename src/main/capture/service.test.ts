import { expect, it } from 'vitest';

import { captureFixture } from './capture-test-fixture';

it('captures through native selection, durable normalization and the shared mutation lifetime', async () => {
  const { store, mutations, shortcuts, os, sources, transfer, service, events } = captureFixture();
  let release: () => void = () => undefined;

  service.subscribe(() => {
    throw new Error('Owned consumer failure');
  });
  try {
    const saved = await service.capture();

    expect(saved).toMatchObject({
      ok: true,
      value: {
        status: 'saved',
        snippet: {
          text: 'echo 你好😀\r\n    $variable\r\n  > comparison\r\n  % formatting',
          sourceApp: 'Terminal',
          sourceAppId: 'terminal'
        }
      }
    });
    store.reopen();
    expect(
      store.invoke('searchSnippets', {
        query: '你好',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 10
      }).total
    ).toBe(1);
    if (!saved.ok || saved.value.status === 'empty') throw new Error('Expected saved capture.');
    const id = saved.value.snippet.id;

    expect(await sources.activate(id)).toMatchObject({ ok: true });
    expect(os.activated).toBe(true);
    expect(events[0]?.preview?.text).toBe(
      'echo 你好😀\r\n    $variable\r\n  > comparison\r\n  % formatting'
    );
    const tag = store.invoke('createTag', { name: 'capture', color: 'green' }).tag;

    store.invoke('setSnippetTags', { id, tagIds: [tag.id] });
    store.invoke('recordSuccessfulCopy', { id });
    expect(await service.capture()).toMatchObject({
      ok: true,
      value: {
        status: 'duplicate',
        snippet: {
          id,
          createdAt: saved.value.snippet.createdAt,
          copyCount: 1,
          tags: [{ id: tag.id }]
        }
      }
    });
    os.text = '  \r\n  ';
    expect(await service.capture()).toMatchObject({ ok: true, value: { status: 'empty' } });
    os.normalize = false;
    os.text = '  $variable\u0000😀\r\n    > comparison\r\n  % formatting  ';
    expect(await service.capture()).toMatchObject({
      ok: true,
      value: { snippet: { text: os.text } }
    });
    os.normalize = true;
    os.text = '> comparison\n  $variable\n  % formatting';
    expect(await service.capture()).toMatchObject({
      ok: true,
      value: { snippet: { text: os.text } }
    });
    os.text = '$ echo exact\n    indented';
    expect(await service.capture()).toMatchObject({
      ok: true,
      value: { snippet: { text: 'echo exact\n    indented' } }
    });
    os.text = 'a'.repeat(1_000_001);
    expect(await service.capture()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    os.failNative = true;
    expect(await service.capture()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    os.failNative = false;
    os.integrity = null;
    expect(await service.capture()).toMatchObject({ ok: false });
    os.integrity = 8192;
    os.text = 'rejected by SQLite';
    store.engine.context.db.exec(
      "CREATE TRIGGER reject_capture BEFORE INSERT ON snippets BEGIN SELECT RAISE(ABORT, 'Owned persistence failure'); END"
    );
    expect(await service.capture()).toMatchObject({ ok: false });
    expect(events.at(-1)?.preview).toBeUndefined();
    store.engine.context.db.exec('DROP TRIGGER reject_capture');
    os.selected = new Promise<void>((resolve) => {
      release = resolve;
    });
    os.text = 'old foreground';
    const paused = service.capture();

    await expect.poll(() => os.selecting).toBe(true);
    expect(await service.capture()).toMatchObject({ ok: false });
    shortcuts.setPaused(true);
    shortcuts.setPaused(false);
    release();
    expect(await paused).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    os.selected = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cleared = service.capture();

    await expect.poll(() => os.selecting).toBe(true);
    expect(
      await transfer.services.clearLibrary({ confirmation: 'CLEAR ALL' }, { senderId: 1 })
    ).toMatchObject({ ok: true });
    release();
    expect(await cleared).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(sources.available(id)).toBe(false);
    os.selected = Promise.resolve();
    os.response = new Promise<void>((resolve) => {
      release = resolve;
    });
    os.text = 'entered persistence';
    const entered = service.capture();

    await expect
      .poll(
        () =>
          store.invoke('searchSnippets', {
            query: '',
            tagIds: [],
            untagged: false,
            sort: 'newest',
            offset: 0,
            limit: 10
          }).total
      )
      .toBe(1);
    const closing = service.close();

    expect(await service.capture()).toMatchObject({ ok: false });
    release();
    expect(await entered).toMatchObject({ ok: true, value: { status: 'saved' } });
    await closing;
    store.reopen();
    expect(
      store
        .invoke('searchSnippets', {
          query: '',
          tagIds: [],
          untagged: false,
          sort: 'newest',
          offset: 0,
          limit: 10
        })
        .items.map((snippet) => snippet.text)
    ).toEqual(['entered persistence']);
    const event = events.at(-1);

    if (event?.selectedAt === undefined || event.persistedAt === undefined)
      throw new Error('Expected completed persistence phases.');
    expect(event.status).toBe('saved');
    expect(event.triggeredAt).toBeLessThan(event.selectedAt);
    expect(event.selectedAt).toBeLessThan(event.persistedAt);
    expect(event.persistedAt).toBeLessThan(event.completedAt);
    expect(event.preview?.text).toBe('entered persistence');
    if (event.id === undefined) throw new Error('Expected committed ID.');
    store.invoke('updateSnippet', { id: event.id, text: 'later edit' });
    expect(event.preview?.text).toBe('entered persistence');
    expect(JSON.stringify(events)).not.toContain('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  } finally {
    release();
    await service.close();
    await transfer.close();
    await mutations.close();
    await shortcuts.close();
    store.dispose();
  }
});
