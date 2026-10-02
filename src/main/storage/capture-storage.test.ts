// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { testStorage } from './storage-test-fixture';

describe('recapture matching and provenance', () => {
  let store: ReturnType<typeof testStorage>;
  let time: Date;
  const capture = { text: 'equal text', sourceApp: 'Terminal', sourceAppId: 'Terminal.exe' };

  beforeEach(() => {
    time = new Date('2026-10-02T05:00:00.000Z');
    store = testStorage(() => time);
  });
  afterEach(() => {
    store.dispose();
  });

  it('preserves the selected copy tags/creation/statistics and leaves other equal-text copies untouched', () => {
    const saved = store.invoke('captureSnippet', capture);

    if (saved.status === 'empty') throw new Error('Expected saved capture.');
    const original = saved.snippet;
    const firstTag = store.invoke('createTag', { name: 'original' }).tag;
    const secondTag = store.invoke('createTag', { name: 'copy' }).tag;

    store.invoke('setSnippetTags', { id: original.id, tagIds: [firstTag.id] });
    store.invoke('recordSuccessfulCopy', { id: original.id });
    time = new Date(time.getTime() + 1000);
    const duplicate = store.invoke('duplicateSnippet', { id: original.id }).snippet;

    store.invoke('setSnippetTags', { id: duplicate.id, tagIds: [secondTag.id] });
    store.invoke('recordSuccessfulCopy', { id: duplicate.id });
    store.invoke('recordSuccessfulCopy', { id: duplicate.id });
    const originalBefore = store.invoke('getSnippet', { id: original.id }).snippet;
    const duplicateBefore = store.invoke('getSnippet', { id: duplicate.id }).snippet;

    time = new Date(time.getTime() + 1000);
    const recaptured = store.invoke('captureSnippet', {
      ...capture,
      sourceApp: null,
      sourceAppId: null
    });

    expect(recaptured).toMatchObject({
      status: 'duplicate',
      snippet: { ...duplicateBefore, updatedAt: time.toISOString() }
    });
    expect(store.invoke('getSnippet', { id: original.id }).snippet).toEqual(originalBefore);
    const recapturedDuplicate = store.invoke('getSnippet', { id: duplicate.id }).snippet;

    time = new Date(time.getTime() + 1000);
    store.invoke('updateSnippet', { id: original.id, text: capture.text });
    time = new Date(time.getTime() + 1000);
    expect(
      store.invoke('captureSnippet', { ...capture, sourceApp: null, sourceAppId: null })
    ).toMatchObject({
      status: 'duplicate',
      snippet: { ...originalBefore, updatedAt: time.toISOString() }
    });
    expect(store.invoke('getSnippet', { id: duplicate.id }).snippet).toEqual(recapturedDuplicate);
  });

  it('breaks equal updatedAt ties by ascending UUID', () => {
    const original = store.invoke('createSnippet', { text: capture.text }).snippet;
    const duplicate = store.invoke('duplicateSnippet', { id: original.id }).snippet;
    const expected = [original.id, duplicate.id].sort()[0];

    time = new Date(time.getTime() + 1000);
    expect(store.invoke('captureSnippet', capture)).toMatchObject({
      status: 'duplicate',
      snippet: { id: expected, updatedAt: time.toISOString() }
    });
  });

  it('preserves absent provenance and replaces partial or complete captures as coherent source pairs', () => {
    store.invoke('captureSnippet', capture);
    time = new Date(time.getTime() + 1000);
    expect(
      store.invoke('captureSnippet', { ...capture, sourceApp: null, sourceAppId: null })
    ).toMatchObject({
      snippet: { sourceApp: capture.sourceApp, sourceAppId: capture.sourceAppId }
    });
    time = new Date(time.getTime() + 1000);
    expect(
      store.invoke('captureSnippet', { ...capture, sourceApp: 'Cursor', sourceAppId: null })
    ).toMatchObject({
      snippet: { sourceApp: 'Cursor', sourceAppId: null }
    });
    time = new Date(time.getTime() + 1000);
    expect(
      store.invoke('captureSnippet', { ...capture, sourceApp: null, sourceAppId: 'Code.exe' })
    ).toMatchObject({
      snippet: { sourceApp: null, sourceAppId: 'Code.exe' }
    });
    time = new Date(time.getTime() + 1000);
    expect(
      store.invoke('captureSnippet', { ...capture, sourceApp: 'Editor', sourceAppId: 'Editor.exe' })
    ).toMatchObject({
      snippet: { sourceApp: 'Editor', sourceAppId: 'Editor.exe' }
    });
  });
});
