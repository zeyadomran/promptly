import assert from 'node:assert/strict';

import type { trayFixture } from './tray-test-fixture';

export async function assertReadyUpdateMenu(owned: ReturnType<typeof trayFixture>) {
  assert.equal(
    owned.menu().some((item) => item.label === 'Restart to update'),
    false
  );
  await owned.updates.check();
  await owned.tray.refresh();
  assert.equal(
    owned.menu().some((item) => item.label === 'Restart to update'),
    false
  );
  await owned.updates.install();
  await owned.tray.refresh();
  const restart = owned.menu().find((item) => item.label === 'Restart to update');

  assert.notEqual(restart?.run, undefined);
  assert.deepEqual(
    owned
      .menu()
      .slice(-3)
      .map((item) => item.label ?? item.type),
    ['Restart to update', 'separator', 'Quit Promptly']
  );
  return restart;
}

export function assertReadyEmptyMenu(owned: ReturnType<typeof trayFixture>) {
  assert.deepEqual(
    owned
      .menu()
      .map((item) => item.label)
      .filter(Boolean),
    ['Recent', 'Open Promptly', 'Pause capture', 'Settings', 'Restart to update', 'Quit Promptly']
  );
}
