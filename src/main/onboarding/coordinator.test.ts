import { expect, test } from 'vitest';

import { type DesktopResult, failure } from '../../shared/contracts/result';
import { SettingsService } from '../settings/service';
import { shortcutFixture } from '../shortcuts/shortcut-test-fixture';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { allSnippets, testStorage } from '../storage/storage-test-fixture';
import { OnboardingCoordinator } from './coordinator';
import { onboardingCaptureFixture, onboardingOwnerFixture } from './onboarding-test-fixture';

test('first-run completion is durable and skipping creates no practice data', async () => {
  const store = testStorage();
  let completionBarrier: Promise<void> | undefined;
  let failCompletion = false;
  let releaseCompletion: () => void = () => undefined;
  const call = async <K extends StorageOperation>(name: K, input: StorageRequest<K>) => {
    if (name === 'updateSettings' && completionBarrier !== undefined) {
      await completionBarrier;
      if (failCompletion) return failure('INTERNAL', 'Owned database write rejected.');
    }

    return store.engine.run(1, name, input).result as DesktopResult<StorageResponse<K>>;
  };

  const settings = new SettingsService({ call }, { available: [], unavailable: [] });
  let visible: string | undefined;
  const lifetime = onboardingOwnerFixture();
  const { owner, states } = lifetime;
  const keyboard = shortcutFixture((callback) => callback);

  await settings.initialize();
  await keyboard.shortcuts.controller.apply(settings.current.settings);
  const coordinator = new OnboardingCoordinator(settings, {
    now: () => 1,
    complete: (_id, destination) => {
      visible = destination;
      return Promise.resolve();
    },
    startTest: (id, publish) => {
      keyboard.shortcuts.startTest(id, publish);
    },
    stopTest: (id) => {
      keyboard.shortcuts.stopTest(id);
    }
  });
  const selection = { supported: false, pending: Promise.resolve() };
  let release: () => void = () => undefined;
  let reopened: SettingsService | undefined;
  const capture = onboardingCaptureFixture(
    { call },
    keyboard.shortcuts,
    owner.windowHandle,
    selection
  );
  let tutorial = coordinator;
  const unsubscribe = capture.subscribe((event) => {
    tutorial.observeCapture(event);
  });

  try {
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: { step: 'welcome', saved: false }
    });
    coordinator.step(owner, 'shortcut');
    completionBarrier = new Promise<void>((resolve) => {
      releaseCompletion = resolve;
    });
    failCompletion = true;
    const pendingSkip = coordinator.finish(owner, true);

    expect(keyboard.shortcuts.captureAdmission()).toBeUndefined();
    expect(await capture.capture()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    keyboard.tap(1000);
    keyboard.tap(1180);
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: { step: 'shortcut', saved: false }
    });
    releaseCompletion();
    expect(await pendingSkip).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    completionBarrier = undefined;
    failCompletion = false;
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: { step: 'shortcut', test: { status: 'waiting' }, saved: false }
    });
    expect(await capture.capture()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    expect(settings.current.settings.onboardingComplete).toBe(false);
    expect(keyboard.shortcuts.captureAdmission()).toBeUndefined();
    keyboard.tap(10);
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: { test: { status: 'tap' }, saved: false }
    });
    keyboard.tap(190);
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: { step: 'detected', test: { status: 'detected', elapsedMs: 180 }, saved: false }
    });
    completionBarrier = new Promise<void>((resolve) => {
      releaseCompletion = resolve;
    });
    const successfulSkip = coordinator.finish(owner, true);

    expect(await capture.capture()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    releaseCompletion();
    expect(await successfulSkip).toMatchObject({ ok: true, value: { completed: true } });
    completionBarrier = undefined;
    expect(keyboard.shortcuts.captureAdmission()).toBeTypeOf('function');
    expect(await settings.services.updateSettings({ onboardingComplete: false })).toMatchObject({
      ok: true
    });
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(0);
    lifetime.close();
    expect(keyboard.shortcuts.captureAdmission()).toBeTypeOf('function');
    lifetime.revive();
    coordinator.step(owner, 'capture');
    expect(await coordinator.finish(owner, false)).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' }
    });
    expect(await capture.capture()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: {
        saved: false,
        error: 'Windows could not save this selection. Select the sample again, or choose Skip.'
      }
    });
    coordinator.step(owner, 'shortcut');
    coordinator.step(owner, 'capture');
    selection.supported = true;
    expect(await capture.capture()).toMatchObject({ ok: true, value: { status: 'saved' } });
    expect(coordinator.state(owner)).toMatchObject({
      ok: true,
      value: {
        saved: true,
        preview: { text: 'A real practice selection', sourceApp: 'Promptly' },
        step: 'preferences'
      }
    });
    await settings.services.updateSettings({ defaultSizeMode: 'regular' });
    expect(await coordinator.finish(owner, false, 'wiki')).toMatchObject({
      ok: true,
      value: { completed: true }
    });
    expect(visible).toBe('wiki');
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(1);
    await coordinator.close();
    await settings.close();
    store.reopen();
    reopened = new SettingsService({ call }, { available: [], unavailable: [] });

    await reopened.initialize();
    expect(reopened.current.settings.onboardingComplete).toBe(true);
    expect(reopened.current.settings.defaultSizeMode).toBe('regular');
    expect(await reopened.services.updateSettings({ onboardingComplete: false })).toMatchObject({
      ok: true
    });
    const skipped = new OnboardingCoordinator(reopened, {
      now: () => 1,
      complete: () => Promise.resolve(),
      startTest: () => undefined,
      stopTest: () => undefined
    });

    tutorial = skipped;
    skipped.step(owner, 'capture');
    selection.pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const lateCapture = capture.capture();

    expect(await skipped.finish(owner, true)).toMatchObject({
      ok: true,
      value: { completed: true, saved: false }
    });
    expect(store.invoke('searchSnippets', allSnippets).total).toBe(1);
    lifetime.close();
    release();
    expect(await lateCapture).toMatchObject({ ok: true, value: { status: 'duplicate' } });
    expect(states.at(-1)).toMatchObject({ completed: true, saved: false });
    expect(skipped.state(owner)).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    await skipped.close();
    await reopened.close();
  } finally {
    releaseCompletion();
    release();
    unsubscribe();
    await capture.close();
    await tutorial.close();
    await reopened?.close();
    await coordinator.close();
    await settings.close();
    await keyboard.shortcuts.close();
    store.dispose();
  }
});
