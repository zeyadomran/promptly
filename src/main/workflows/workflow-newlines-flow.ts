import assert from 'node:assert/strict';

import type { workflowFixture } from './workflow-test-fixture';

export async function assertContextNewlines(
  fixture: ReturnType<typeof workflowFixture>,
  one: string,
  two: string
): Promise<void> {
  const interior = '\r\n'.repeat(32);

  fixture.store.invoke('updateSnippet', {
    id: one,
    text: `  leading${interior}middle \r\n\r\n\r`
  });
  fixture.store.invoke('updateSnippet', { id: two, text: 'last\r\n \r\n' });
  const prepared = await fixture.service.services.prepareCopy(
    { source: { kind: 'bundle', ids: [one, two], separator: 'blank-line' } },
    { senderId: 1 }
  );

  if (!prepared.ok) throw new Error(prepared.error.message);
  const expected = `  leading${interior}middle \n\nlast\r\n `;

  assert.equal(prepared.value.text, expected);
  const copied = await fixture.service.services.commitCopy(
    {
      token: prepared.value.token,
      values: {},
      format: 'text',
      mode: 'as-written',
      return: false
    },
    { senderId: 1 }
  );

  assert.equal(copied.ok, true);
  assert.equal(fixture.clipboard.at(-1), expected);
}
