// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { defaultShortcutSettings } from '../../shared/shortcuts/defaults';
import { planShortcutEdit } from '../../shared/shortcuts/shortcut-edit';
import { testSettings } from '../settings/settings-test-fixture';
import { assertComposeShortcutFlow } from './compose-shortcut-test-flow';
import { exerciseShortcutRecovery } from './recovery-test-flow';
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
    const legacy = storage.store.engine.context.db.prepare(
      'UPDATE settings SET value = ? WHERE key = ?'
    );

    legacy.run('"Shift+1"', 'pinShortcut');
    legacy.run('{"kind":"combination","accelerator":"Shift+1"}', 'saveShortcut');

    fixture.failures.add('Control+F');
    await storage.service.initialize();
    await exerciseShortcutRecovery(fixture, storage);
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
      'Alt+Shift+N',
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
          composeShortcut: 'Alt+Shift+N',
          composeDestination: 'queue',
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
    expect([...fixture.registered.keys()].sort()).toEqual(['Alt+Shift+N', 'Alt+Space']);
    storage.store.reopen();
    expect(await storage.service.services.getSettings({})).toEqual(reset);
    expect(storage.store.invoke('getSnippet', { id: owned.id }).snippet).toEqual(owned);
    await assertComposeShortcutFlow(fixture, storage);
    const current = storage.service.current;
    const edit = planShortcutEdit(current.settings, 'tag', 'Control+F');

    expect(edit).toMatchObject({
      kind: 'conflict',
      collision: { action: 'focusSearch', label: 'Focus search', swapAllowed: true }
    });
    if (edit.kind !== 'conflict' || edit.swapPatch === undefined)
      throw new Error('Expected an atomic shortcut swap.');
    const swapped = await storage.service.services.updateSettings(edit.swapPatch);

    expect(swapped).toMatchObject({
      ok: true,
      value: {
        revision: current.revision + 1,
        settings: {
          localShortcuts: {
            tag: 'Control+F',
            focusSearch: 'CommandOrControl+T',
            dismiss: 'Escape',
            cancelEdit: 'Escape'
          }
        }
      }
    });
    storage.store.reopen();
    expect(await storage.service.services.getSettings({})).toEqual(swapped);
    expect(planShortcutEdit(storage.service.current.settings, 'cancelEdit', 'Escape').kind).toBe(
      'ready'
    );
    expect(planShortcutEdit(storage.service.current.settings, 'copy', 'F1').kind).toBe('ready');
    await storage.service.services.updateSettings({
      saveShortcut: { kind: 'combination', accelerator: 'Control+Alt+S' }
    });
    const beforeGlobal = storage.service.current;

    expect(planShortcutEdit(beforeGlobal.settings, 'pin', 'Alt+Space')).toMatchObject({
      kind: 'conflict',
      collision: { action: 'open', swapAllowed: false }
    });

    expect(planShortcutEdit(beforeGlobal.settings, 'next', 'Control+Alt+S')).toMatchObject({
      kind: 'conflict',
      collision: { action: 'save', swapAllowed: false }
    });
    const globalEdit = planShortcutEdit(beforeGlobal.settings, 'open', 'Control+Alt+S');

    if (globalEdit.kind !== 'conflict' || globalEdit.swapPatch === undefined)
      throw new Error('Expected a safe global exchange.');
    const globalSwap = await storage.service.services.updateSettings(globalEdit.swapPatch);

    expect(globalSwap).toMatchObject({
      ok: true,
      value: {
        revision: beforeGlobal.revision + 1,
        settings: {
          openShortcut: 'Control+Alt+S',
          saveShortcut: { kind: 'combination', accelerator: 'Alt+Space' }
        }
      }
    });
    storage.store.reopen();
    expect(await storage.service.services.getSettings({})).toEqual(globalSwap);
    const reverse = planShortcutEdit(storage.service.current.settings, 'open', 'Alt+Space');

    if (reverse.kind !== 'conflict' || reverse.swapPatch === undefined)
      throw new Error('Expected a reversible exchange.');
    storage.store.engine.context.db.exec(
      "CREATE TRIGGER reject_owned_swap BEFORE UPDATE ON settings WHEN NEW.key = 'openShortcut' BEGIN SELECT RAISE(ABORT, 'owned disk failure'); END;"
    );
    expect(await storage.service.services.updateSettings(reverse.swapPatch)).toMatchObject({
      ok: false
    });
    storage.store.engine.context.db.exec('DROP TRIGGER reject_owned_swap');
    expect(await storage.service.services.getSettings({})).toEqual(globalSwap);
    fixture.registered.get('Control+Alt+S')?.();
    expect(fixture.commands.open).toHaveBeenCalledTimes(2);
    storage.store.reopen();
    expect(await storage.service.services.getSettings({})).toEqual(globalSwap);
    fixture.shortcuts.stopCommands();
    expect(fixture.shortcuts.retry()).toBe(false);
  } finally {
    await fixture.shortcuts.close();
    storage.store.dispose();
  }
});
