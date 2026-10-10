import { expect, it } from 'vitest';

import { workflowBoundsFlow } from './workflow-bounds-flow';
import { draftCopyFlow } from './workflow-draft-flow';
import { workflowFixture } from './workflow-test-fixture';

it('prepares authoritative bundle text with shared transient answers and copies its exact preview', async () => {
  const fixture = workflowFixture();

  try {
    const one = fixture.store.invoke('createSnippet', {
      text: 'Hello {{ name }}\n{{constructor}}\n'
    }).snippet.id;
    const two = fixture.store.invoke('createSnippet', {
      text: '{{name}} {{ toString }} {{file name}}'
    }).snippet.id;
    const prepared = await fixture.service.services.prepareCopy(
      { source: { kind: 'bundle', ids: [two, one], separator: 'divider' } },
      { senderId: 1 }
    );

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error(prepared.error.message);
    expect(prepared.value.text).toBe(
      '{{name}} {{ toString }} {{file name}}\n\n---\n\nHello {{ name }}\n{{constructor}}'
    );
    expect(prepared.value.variables).toEqual([
      { name: 'name', count: 2, sourceIndexes: [1, 2] },
      { name: 'toString', count: 1, sourceIndexes: [1] },
      { name: 'constructor', count: 1, sourceIndexes: [2] }
    ]);
    const values = {
      name: { value: '{{next}}', leaveBlank: false },
      toString: { value: '', leaveBlank: true },
      constructor: { value: '  ', leaveBlank: false }
    };

    expect(
      await fixture.service.services.commitCopy(
        { token: prepared.value.token, values, format: 'text', mode: 'resolved', return: false },
        { senderId: 1 }
      )
    ).toMatchObject({ ok: true, value: { status: 'copied' } });
    expect(fixture.clipboard).toEqual(['{{next}}  {{file name}}\n\n---\n\nHello {{next}}\n  ']);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: one }).snippet.text).toBe(
      'Hello {{ name }}\n{{constructor}}\n'
    );
    const tagged = await fixture.service.services.prepareCopy(
      { source: { kind: 'bundle', ids: [two, one], separator: 'tagged' } },
      { senderId: 1 }
    );

    if (!tagged.ok) throw new Error(tagged.error.message);
    expect(tagged.value.text).toBe(
      '<snippet index="1">\n{{name}} {{ toString }} {{file name}}\n</snippet>\n\n<snippet index="2">\nHello {{ name }}\n{{constructor}}\n</snippet>'
    );
    expect(
      await fixture.service.services.commitCopy(
        { token: tagged.value.token, values, format: 'markdown', mode: 'resolved', return: false },
        { senderId: 1 }
      )
    ).toMatchObject({ ok: true });
    expect(fixture.clipboard.at(-1)).toBe(
      '```\n<snippet index="1">\n{{next}}  {{file name}}\n</snippet>\n\n<snippet index="2">\nHello {{next}}\n  \n</snippet>\n```'
    );
    const literal = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id: one } },
      { senderId: 1 }
    );

    if (!literal.ok) throw new Error(literal.error.message);
    expect(
      await fixture.service.services.commitCopy(
        {
          token: literal.value.token,
          values: {},
          format: 'text',
          mode: 'as-written',
          return: false
        },
        { senderId: 1 }
      )
    ).toMatchObject({ ok: true });
    expect(fixture.clipboard.at(-1)).toBe('Hello {{ name }}\n{{constructor}}\n');
  } finally {
    await fixture.dispose();
  }
});

it('rejects stale content inside the copy turn and allows statistics-only changes without renewing review', async () => {
  const fixture = workflowFixture();

  try {
    const id = fixture.store.invoke('createSnippet', { text: 'before {{name}}' }).snippet.id;
    const prepared = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id } },
      { senderId: 1 }
    );

    if (!prepared.ok) throw new Error(prepared.error.message);
    const commit = {
      token: prepared.value.token,
      values: { name: { value: 'value', leaveBlank: false } },
      format: 'text' as const,
      mode: 'resolved' as const,
      return: false
    };
    let release: () => void = () => undefined;
    let enter: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const edit = fixture.mutations.run(async () => {
      enter();
      await hold;
      fixture.store.invoke('updateSnippet', { id, text: 'after {{name}}' });
      return { ok: true, value: {} };
    });

    await ready;
    const copying = fixture.service.services.commitCopy(commit, { senderId: 1 });

    release();
    await edit;
    expect(await copying).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(fixture.clipboard).toEqual([]);
    const refreshed = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id } },
      { senderId: 1 }
    );

    if (!refreshed.ok) throw new Error(refreshed.error.message);
    fixture.store.invoke('recordSuccessfulCopy', { id });
    expect(
      await fixture.service.services.commitCopy(
        { ...commit, token: refreshed.value.token },
        { senderId: 1 }
      )
    ).toMatchObject({ ok: true });
    expect(fixture.clipboard).toEqual(['after value']);
    const tag = fixture.store.invoke('createTag', { name: 'changed' }).tag.id;
    const tagged = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id } },
      { senderId: 1 }
    );

    if (!tagged.ok) throw new Error(tagged.error.message);
    fixture.store.invoke('setSnippetTags', { id, tagIds: [tag] });
    expect(
      await fixture.service.services.commitCopy(
        { ...commit, token: tagged.value.token },
        { senderId: 1 }
      )
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    fixture.store.invoke('deleteSnippet', { id });
    expect(
      await fixture.service.services.commitCopy(
        { ...commit, token: tagged.value.token },
        { senderId: 1 }
      )
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(fixture.clipboard).toEqual(['after value']);
  } finally {
    await fixture.dispose();
  }
});

it(
  'keeps exact unsaved drafts on clipboard failure, rejects changed revisions and retires sender-owned tokens',
  draftCopyFlow
);

it(
  'enforces the reviewed variable grammar and aggregate copy limits without partial clipboard writes',
  workflowBoundsFlow
);
