import { expect, it } from 'vitest';

import type { ShortcutStatus } from '../../../shared/contracts/shortcuts';
import { shortcutGroupRegistration } from './shortcut-group-registration';
import { shortcutRegistration } from './shortcut-registration';

it('explains the affected shortcut without confusing registration and selection support', () => {
  const status: ShortcutStatus = {
    capture: 'registered',
    open: 'unavailable',
    pin: 'disabled',
    hook: 'installed',
    capturePaused: false,
    recording: false,
    quarantined: false,
    captureHandlerAvailable: true,
    labels: { capture: 'Shift × 2', open: 'Alt+Space', pin: null }
  };

  expect(shortcutRegistration(status, 'open').detail).not.toMatch(/modifier|listener/i);
  expect(shortcutRegistration(status, 'capture').detail).toContain('native selection');
  expect(shortcutGroupRegistration(status, 'double-tap')).toMatchObject({
    state: 'unavailable',
    label: 'Open unavailable'
  });
  expect(shortcutGroupRegistration(status, 'double-tap').detail).not.toContain('is available');
  const failedCapture = {
    ...status,
    capture: 'unavailable' as const,
    hook: 'unavailable' as const
  };

  expect(shortcutRegistration(failedCapture, 'capture', 'double-tap')).toMatchObject({
    label: 'Listener unavailable'
  });
  expect(shortcutRegistration(failedCapture, 'capture', 'combination').detail).not.toMatch(
    /modifier|listener/i
  );
  expect(shortcutGroupRegistration({ ...status, open: 'registered' }, 'double-tap')).toMatchObject({
    state: 'registered',
    label: 'All registered'
  });
  expect(
    shortcutGroupRegistration({ ...status, capturePaused: true, open: 'registered' }, 'double-tap')
  ).toMatchObject({
    state: 'neutral',
    label: 'Paused',
    detail: 'Capture: Selection capture is paused.'
  });
  expect(shortcutGroupRegistration({ ...status, recording: true }, 'double-tap')).toMatchObject({
    state: 'neutral',
    label: 'Suppressed'
  });
  expect(shortcutGroupRegistration({ ...status, quarantined: true }, 'double-tap')).toMatchObject({
    state: 'unavailable',
    label: 'Restart required'
  });
});
