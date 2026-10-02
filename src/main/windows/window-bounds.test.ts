import type { BrowserWindow } from 'electron';
import { afterEach, expect, it, vi } from 'vitest';

import { defaultSettings, settingsSchema } from '../../shared/contracts/settings';
import type { SettingsService } from '../settings/service';
import type { Rectangle } from './geometry';
import { WindowBounds } from './window-bounds';

vi.mock('electron', () => ({
  screen: {
    getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }),
    getAllDisplays: () => []
  }
}));

function fixture(platform: NodeJS.Platform = 'win32') {
  let rectangle: Rectangle = { x: 10, y: 10, width: 440, height: 600 };
  let snapshot = { revision: 0, settings: defaultSettings() };
  const listeners = new Map<string, () => void>();
  const window = {
    on: (event: string, listener: () => void) => listeners.set(event, listener),
    isDestroyed: () => false,
    getNormalBounds: () => ({ ...rectangle }),
    getBounds: () => ({ ...rectangle }),
    setBounds: vi.fn((next: Rectangle) => {
      rectangle = next;
    }),
    setMinimumSize: vi.fn(),
    setMaximumSize: vi.fn(),
    isFullScreen: () => false,
    isMaximized: () => false
  };
  const update = vi.fn<SettingsService['services']['updateSettings']>((patch) => {
    snapshot = {
      revision: snapshot.revision + 1,
      settings: settingsSchema.parse({ ...snapshot.settings, ...patch })
    };
    return Promise.resolve({ ok: true, value: snapshot });
  });
  const settings = {
    get current() {
      return snapshot;
    },
    services: { updateSettings: update }
  };
  const onError = vi.fn();
  const bounds = new WindowBounds(
    window as unknown as BrowserWindow,
    settings as unknown as SettingsService,
    'compact',
    onError,
    platform
  );

  return { window, bounds, update, onError, listeners, snapshot: () => snapshot };
}

afterEach(() => {
  vi.useRealTimers();
});

it('drains accepted position commits and preserves the other mode/startup preference', async () => {
  const { bounds, update, snapshot } = fixture();
  let complete: (() => void) | undefined;
  const accepted = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const originalUpdate = update.getMockImplementation();

  update.mockImplementationOnce(async (patch) => {
    await accepted;
    if (originalUpdate === undefined) throw new Error('Missing update implementation.');
    return originalUpdate(patch);
  });
  bounds.save();
  let closed = false;
  const drain = bounds.close().then(() => {
    closed = true;
  });

  await Promise.resolve();
  expect(closed).toBe(false);
  complete?.();
  await drain;
  expect(snapshot().settings.rememberedBounds).toEqual({
    compact: { x: 10, y: 10, width: 440, height: 600 },
    regular: null
  });
  expect(snapshot().settings.defaultSizeMode).toBe('compact');
});

it('keeps save recovery failures visible to shutdown after attempting accepted work', async () => {
  const { bounds, update, onError } = fixture();

  update.mockResolvedValue({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Restart to recover preferences.' }
  });
  await expect(bounds.close()).rejects.toThrow('Restart to recover preferences.');
  expect(onError).toHaveBeenCalledOnce();
});

it('interpolates only on supported platforms and persists final native geometry', async () => {
  vi.useFakeTimers();
  const { bounds, window, snapshot } = fixture('darwin');

  await bounds.switchMode('regular', false);
  expect(window.getBounds().width).toBe(440);
  await vi.advanceTimersByTimeAsync(192);
  expect(window.getBounds()).toEqual({ x: 10, y: 10, width: 1000, height: 640 });
  await bounds.close();
  expect(snapshot().settings.rememberedBounds.regular).toEqual(window.getBounds());
});

it('reduced motion and user interaction interrupt animation without leaving a pending overwrite', async () => {
  vi.useFakeTimers();
  const { bounds, window, listeners, snapshot } = fixture('darwin');

  await bounds.switchMode('regular', true);
  expect(window.getBounds().width).toBe(1000);
  await bounds.switchMode('compact', false);
  await vi.advanceTimersByTimeAsync(64);
  listeners.get('will-resize')?.();
  window.setBounds({ x: 15, y: 15, width: 440, height: 550 });
  await vi.advanceTimersByTimeAsync(500);
  expect(window.getBounds()).toEqual({ x: 15, y: 15, width: 440, height: 550 });
  await bounds.close();
  expect(snapshot().settings.rememberedBounds.compact).toEqual(window.getBounds());
});
