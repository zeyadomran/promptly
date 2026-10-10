import assert from 'node:assert/strict';

import type { TrayItem } from './ports';
import type { trayFixture } from './tray-test-fixture';

export function assertTrayConfirmedCopy(owned: ReturnType<typeof trayFixture>, full: string) {
  assert.deepEqual(owned.clipboard, [full]);
  assert.equal(owned.statuses.at(-1), 'Copied');
  assert.equal(owned.windows.includes('unexpected hide'), false);
}

export async function assertTrayTemplateRoute(
  owned: ReturnType<typeof trayFixture>,
  item: TrayItem,
  id: string,
  original: string
) {
  const before = [...owned.clipboard];

  owned.fixture.store.invoke('updateSnippet', { id, text: 'Hello {{name}}' });
  await item.run?.();
  assert.deepEqual(owned.clipboard, before);
  assert.equal(owned.windows.at(-1), `prepare ${id}`);
  assert.equal(owned.statuses.at(-1), 'Fill values in Promptly');
  owned.fixture.store.invoke('updateSnippet', { id, text: original });
}
