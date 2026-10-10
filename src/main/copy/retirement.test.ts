import { expect, it } from 'vitest';

import { copyFixture } from './copy-test-fixture';
import { MainCopyOwner } from './main-owner';

it('drains renderer and main-owned writes after retirement without replay or unrelated hiding', async () => {
  let release: () => void = () => undefined;
  let entered: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let releaseMain: () => void = () => undefined;
  let enteredMain: () => void = () => undefined;
  const mainReady = new Promise<void>((resolve) => {
    enteredMain = resolve;
  });
  const mainHeld = new Promise<void>((resolve) => {
    releaseMain = resolve;
  });
  const clipboard: string[] = [];
  const fixture = copyFixture(async (text) => {
    clipboard.push(text);
    if (clipboard.length === 1) {
      entered();
      await held;
    } else {
      enteredMain();
      await mainHeld;
    }
  });
  const main = new MainCopyOwner();

  try {
    const copying = fixture.copy();

    await ready;
    const mainCopy = fixture.service.copyFromMain({ id: fixture.id, format: 'text' }, main);

    fixture.retire();
    release();
    expect(await copying).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 1 }, warnings: [] }
    });
    await mainReady;
    main.close();
    const closing = fixture.service.close();

    expect(await fixture.copy()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    releaseMain();
    expect(await mainCopy).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 2 }, warnings: [] }
    });
    await closing;
    expect(clipboard).toEqual(['stored text', 'stored text']);
    expect(fixture.visible()).toBe(true);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(2);
  } finally {
    release();
    releaseMain();
    main.close();
    await fixture.dispose();
  }
});
