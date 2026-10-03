// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { defaultShortcutSettings } from '../../shared/shortcuts/defaults';
import { testSettings } from '../settings/settings-test-fixture';
import { shortcutFixture } from './shortcut-test-fixture';

it('replaces and resets shortcuts atomically while preserving rejected bindings and other preferences', async () => {
  const fixture = shortcutFixture(vi.fn);
  const storage = testSettings({ available: [fixture.shortcuts.controller], unavailable: [] });

  try {
    storage.store.invoke('updateSettings', {
      openShortcut: 'Control+F',
      pinShortcut: 'Super+P',
      saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+F7' },
      doubleTapWindowMs: 450,
      localShortcuts: { ...fixture.settings.localShortcuts, copy: 'Control+K' },
      theme: 'dark',
      showConfirmationToast: false,
      normalizeWhitespace: false,
      onboardingComplete: true
    });
    const owned = storage.store.invoke('createSnippet', { text: 'Owned retained snippet' }).snippet;

    await storage.service.initialize();
    const initial = await storage.service.services.getSettings({});

    if (!initial.ok) throw new Error('Expected initial preferences.');
    expect(fixture.registered.has('Control+F')).toBe(true);
    expect(fixture.registered.has('Super+P')).toBe(true);
    fixture.failures.add('Control+Alt+F9');
    expect(
      await storage.service.services.updateSettings({
        openShortcut: 'Control+Alt+F9',
        pinShortcut: 'Control+Alt+F8'
      })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(await storage.service.services.getSettings({})).toEqual(initial);
    fixture.registered.get('Control+F')?.();
    expect(fixture.commands.open).toHaveBeenCalledOnce();
    expect(fixture.registered.has('Control+Alt+F8')).toBe(false);
    fixture.failures.add('Alt+Space');
    const rejectedReset = await storage.service.services.updateSettings(defaultShortcutSettings());

    expect(rejectedReset).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' }
    });
    if (rejectedReset.ok) throw new Error('Expected rejected default registration.');
    expect(rejectedReset.error.message).toContain(
      'The operating system did not register this shortcut.'
    );
    storage.store.reopen();
    expect(await storage.service.services.getSettings({})).toEqual(initial);
    expect([...fixture.registered.keys()].sort()).toEqual([
      'Control+Alt+F7',
      'Control+F',
      'Super+P'
    ]);
    fixture.failures.delete('Alt+Space');
    const reset = await storage.service.services.updateSettings(defaultShortcutSettings());

    expect(reset).toMatchObject({
      ok: true,
      value: {
        settings: {
          saveShortcut: { kind: 'double-tap', modifier: 'shift' },
          openShortcut: 'Alt+Space',
          pinShortcut: null,
          doubleTapWindowMs: 300,
          localShortcuts: {
            next: 'Down',
            previous: 'Up',
            copy: 'Return',
            delete: 'Delete',
            deleteAlternate: 'Backspace',
            focusSearch: 'CommandOrControl+F',
            tag: 'CommandOrControl+T',
            settings: 'CommandOrControl+,',
            dismiss: 'Escape',
            cancelEdit: 'Escape'
          },
          theme: 'dark',
          showConfirmationToast: false,
          normalizeWhitespace: false,
          onboardingComplete: true
        }
      }
    });
    expect([...fixture.registered.keys()]).toEqual(['Alt+Space']);
    storage.store.reopen();
    expect(await storage.service.services.getSettings({})).toEqual(reset);
    expect(storage.store.invoke('getSnippet', { id: owned.id }).snippet).toEqual(owned);
  } finally {
    await fixture.shortcuts.close();
    storage.store.dispose();
  }
});
