import { expect, test } from 'vitest';

import type { CaptureEvent } from '../capture/ports';
import type { ToastEffects, ToastWindow } from './ports';
import { CaptureToastService } from './service';

test('committed confirmation owns inactive visibility, replacement and retirement', async () => {
  let shown: Parameters<ToastWindow['present']> | undefined;
  let visible = false;
  let alive = true;
  let now = 0;
  const timers = new Map<() => void, number>();
  const window: ToastWindow = {
    alive: () => alive,
    present: (...value) => {
      shown = value;
      visible = true;
    },
    hide: () => {
      visible = false;
    },
    destroy: () => {
      alive = false;
      visible = false;
    }
  };
  const effects: ToastEffects = {
    create: () => Promise.resolve(window),
    workArea: () => ({ x: -1280, y: 0, width: 1280, height: 720 }),
    schedule: (callback, delay) => {
      timers.set(callback, now + delay);
      return () => {
        timers.delete(callback);
      };
    },
    failed: () => {
      throw new Error('Unexpected overlay failure.');
    }
  };
  const event: CaptureEvent = {
    status: 'saved',
    triggeredAt: 0,
    completedAt: 1,
    sourceBounds: { x: -1200, y: 20, width: 800, height: 600 },
    preview: {
      id: 'private',
      text: 'Exact committed text\nSecond line',
      sourceApp: null,
      sourceAppId: null
    }
  };
  const service = new CaptureToastService(effects, { enabled: true, theme: 'dark' });

  await service.capture(event);
  expect(visible).toBe(true);
  expect(shown).toEqual([
    {
      version: 1,
      status: 'saved',
      preview: 'Exact committed text',
      theme: 'dark',
      phase: 'visible'
    },
    { x: -346, y: 594, width: 330, height: 110 }
  ]);
  now = 1000;
  await service.capture({
    ...event,
    status: 'duplicate',
    preview: { id: 'private', text: 'Latest committed 😀', sourceApp: null, sourceAppId: null }
  });
  expect(shown?.[0]).toEqual({
    version: 2,
    status: 'duplicate',
    preview: 'Latest committed 😀',
    theme: 'dark',
    phase: 'visible'
  });
  expect(timers.size).toBe(1);
  service.updatePreferences({ enabled: true, theme: 'system' });
  expect(shown?.[0].theme).toBe('system');
  effects.workArea = () => ({ x: 2000, y: -900, width: 1920, height: 1080 });
  service.displayChanged();
  expect(shown?.[1]).toEqual({ x: 3574, y: 54, width: 330, height: 110 });
  await service.capture({ ...event, status: 'failed' });
  await service.capture({ ...event, status: 'empty' });
  expect(shown?.[0].status).toBe('duplicate');
  now = 2500;
  for (const [callback, deadline] of timers) if (deadline <= now) callback();
  expect(visible).toBe(true);
  now = 3300;
  for (const [callback, deadline] of timers) if (deadline <= now) callback();
  expect(visible).toBe(true);
  expect(shown?.[0]).toHaveProperty('phase', 'leaving');
  now = 3500;
  for (const [callback, deadline] of timers) if (deadline <= now) callback();
  expect(visible).toBe(false);
  expect(timers.size).toBe(0);
  service.updatePreferences({ enabled: false, theme: 'light' });
  await service.capture(event);
  expect(visible).toBe(false);
  service.updatePreferences({ enabled: true, theme: 'light' });
  await service.capture(event);
  service.updatePreferences({ enabled: false, theme: 'light' });
  expect(visible).toBe(false);
  expect(timers.size).toBe(0);
  await service.close();
  expect(alive).toBe(false);
  await service.capture(event);
  expect(visible).toBe(false);

  // Retire while Electron is loading: a late owned window must never become visible.
  let resolveWindow: ((window: ToastWindow) => void) | undefined;
  const pending = new Promise<ToastWindow>((resolve) => {
    resolveWindow = resolve;
  });

  effects.create = () => pending;
  alive = true;
  const loading = new CaptureToastService(effects, { enabled: true, theme: 'light' });
  const first = loading.capture(event);
  const replacement = loading.capture({ ...event, status: 'duplicate' });
  const closed = loading.close();

  resolveWindow?.(window);
  await Promise.all([first, replacement, closed]);
  expect(visible).toBe(false);
  expect(alive).toBe(false);
  expect(timers.size).toBe(0);
});
