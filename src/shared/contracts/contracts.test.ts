import { describe, expect, it } from 'vitest';

import { changeEventSchema, snippetSchema } from './domain';
import { operations } from './operations';
import { settingsPatchSchema } from './settings';

describe('desktop request boundaries', () => {
  it.each([
    { text: 'hello', path: 'C:/secret' },
    { text: 'hello', sourceAppId: 'cmd.exe' },
    { text: ' ' },
    { text: 42 },
    { text: 'a'.repeat(1_000_001) }
  ])('rejects unsafe create payloads', (request) => {
    expect(operations.createSnippet.request.safeParse(request).success).toBe(false);
  });
  it('rejects excessive pagination, invalid IDs, arbitrary fields, and empty settings patches', () => {
    expect(
      operations.searchSnippets.request.safeParse({
        query: '',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 201
      }).success
    ).toBe(false);
    expect(operations.getSnippet.request.safeParse({ id: '../../database' }).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ theme: 'light', command: 'rm' }).success).toBe(false);
    expect(settingsPatchSchema.safeParse({}).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ doubleTapWindowMs: 601 }).success).toBe(false);
  });
  it('accepts markup only as text and rejects executable paths in source provenance', () => {
    const snippet = {
      id: '00000000-0000-4000-8000-000000000001',
      text: '<script>window.xss = true</script>',
      createdAt: '2026-10-02T04:00:00.000Z',
      updatedAt: '2026-10-02T04:00:00.000Z',
      sourceApp: null,
      sourceAppId: null,
      tags: [],
      lastCopiedAt: null,
      copyCount: 0
    };

    expect(snippetSchema.safeParse(snippet).success).toBe(true);
    expect(
      snippetSchema.safeParse({ ...snippet, sourceAppId: 'C:\\Windows\\cmd.exe' }).success
    ).toBe(false);
    expect(changeEventSchema.safeParse({ revision: -1, domains: ['snippets'] }).success).toBe(
      false
    );
    expect(changeEventSchema.safeParse({ revision: 1, domains: ['filesystem'] }).success).toBe(
      false
    );
  });
});
