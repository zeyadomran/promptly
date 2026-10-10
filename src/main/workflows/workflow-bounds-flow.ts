import assert from 'node:assert/strict';

import { workflowFixture } from './workflow-test-fixture';

/** The copy boundary owns grammar and aggregate limits; no parser-only duplicate suite. */
export async function workflowBoundsFlow() {
  const fixture = workflowFixture();

  try {
    const text = '{{{File}}} {{ file }} {{Å_١}} {{File}} {{file name}} {{x.y}} {{}} {{ a\n}}';
    const id = fixture.store.invoke('createSnippet', { text }).snippet.id;
    const prepared = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id } },
      { senderId: 1 }
    );

    assert.equal(prepared.ok, true);
    assert.deepEqual(prepared.value.variables, [
      { name: 'File', count: 2, sourceIndexes: [1] },
      { name: 'file', count: 1, sourceIndexes: [1] },
      { name: 'Å_١', count: 1, sourceIndexes: [1] }
    ]);
    assert.equal(
      (
        await fixture.service.services.commitCopy(
          {
            token: prepared.value.token,
            values: Object.fromEntries(
              ['File', 'file', 'Å_١'].map((name) => [name, { value: 'V', leaveBlank: false }])
            ),
            format: 'text',
            mode: 'resolved',
            return: false
          },
          { senderId: 1 }
        )
      ).ok,
      true
    );
    assert.deepEqual(fixture.clipboard, ['{V} V V V {{file name}} {{x.y}} {{}} {{ a\n}}']);
    const repeated = fixture.store.invoke('createSnippet', { text: '{{v}}'.repeat(11) }).snippet.id;
    const repeatedCopy = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id: repeated } },
      { senderId: 1 }
    );

    assert.equal(repeatedCopy.ok, true);
    const commit = {
      token: repeatedCopy.value.token,
      format: 'text' as const,
      mode: 'resolved' as const,
      return: false
    };
    const tooLongValue = await fixture.service.services.commitCopy(
      { ...commit, values: { v: { value: 'x'.repeat(100001), leaveBlank: false } } },
      { senderId: 1 }
    );

    assert.equal(tooLongValue.ok, false);
    assert.equal(tooLongValue.error.code, 'INVALID_REQUEST');
    const tooLongResult = await fixture.service.services.commitCopy(
      { ...commit, values: { v: { value: 'x'.repeat(100000), leaveBlank: false } } },
      { senderId: 1 }
    );

    assert.equal(tooLongResult.ok, false);
    assert.equal(tooLongResult.error.code, 'INVALID_REQUEST');
    const variableLimit = fixture.store.invoke('createSnippet', {
      text: Array.from({ length: 33 }, (_entry, index) => `{{v${String(index)}}}`).join(' ')
    }).snippet.id;
    const tooManyNames = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id: variableLimit } },
      { senderId: 1 }
    );

    assert.equal(tooManyNames.ok, false);
    assert.equal(tooManyNames.error.code, 'INVALID_REQUEST');
    const literal = await fixture.service.services.prepareCopy(
      { source: { kind: 'snippet', id: variableLimit }, mode: 'as-written' },
      { senderId: 1 }
    );

    assert.equal(literal.ok, true);
    const literalCommit = {
      token: literal.value.token,
      values: {},
      format: 'text' as const,
      return: false
    };

    assert.equal(
      (
        await fixture.service.services.commitCopy(
          { ...literalCommit, mode: 'resolved' },
          { senderId: 1 }
        )
      ).ok,
      false
    );
    assert.equal(
      (
        await fixture.service.services.commitCopy(
          { ...literalCommit, mode: 'as-written' },
          { senderId: 1 }
        )
      ).ok,
      true
    );
    const literalText = Array.from({ length: 33 }, (_entry, index) => `{{v${String(index)}}}`).join(
      ' '
    );

    assert.equal(fixture.clipboard.at(-1), literalText);
    const first = fixture.store.invoke('createSnippet', { text: 'a'.repeat(600001) }).snippet.id;
    const second = fixture.store.invoke('createSnippet', { text: 'b'.repeat(600001) }).snippet.id;
    const tooLongBundle = await fixture.service.services.prepareCopy(
      { source: { kind: 'bundle', ids: [first, second], separator: 'blank-line' } },
      { senderId: 1 }
    );

    assert.equal(tooLongBundle.ok, false);
    assert.equal(tooLongBundle.error.code, 'INVALID_REQUEST');
    assert.deepEqual(fixture.clipboard, [
      '{V} V V V {{file name}} {{x.y}} {{}} {{ a\n}}',
      literalText
    ]);
  } finally {
    await fixture.dispose();
  }
}
