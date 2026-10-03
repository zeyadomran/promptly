import assert from 'node:assert/strict';

import type { CaptureToast } from '../../shared/contracts/capture-toast';
import type { CaptureEvent } from '../capture/ports';
import { CaptureToastService } from './service';

export async function assertCaptureFailureFeedback(): Promise<void> {
  let shown: CaptureToast | undefined;
  let now = 0;
  const timers = new Set<() => void>();
  const service = new CaptureToastService(
    {
      now: () => now,
      create: () =>
        Promise.resolve({
          alive: () => true,
          visible: () => shown !== undefined,
          present: (toast) => {
            shown = toast;
          },
          hide: () => {
            shown = undefined;
          },
          destroy: () => {
            shown = undefined;
          }
        }),
      openPromptly: () => Promise.resolve(),
      workArea: () => ({ x: 0, y: 0, width: 1000, height: 800 }),
      schedule: (callback) => {
        timers.add(callback);
        return () => {
          timers.delete(callback);
        };
      },
      failed: () => {
        throw new Error('Unexpected window failure');
      }
    },
    { enabled: true, theme: 'dark' }
  );
  const event: CaptureEvent = {
    status: 'failed',
    reason: 'UNAVAILABLE',
    message:
      'This focused control does not expose a supported native text selection. No snippet was saved.',
    triggeredAt: 0,
    completedAt: 1
  };

  try {
    await service.capture(event);
    assert.equal(shown?.status, 'failed');
    assert.equal(shown.preview, event.message);
    assert.equal(shown.version, 1);
    await service.capture(event);
    await service.capture({ ...event, reason: 'CONFLICT' });
    await service.capture({ ...event, status: 'empty' });
    assert.equal(shown.version, 1);
    now = 5000;
    await service.capture(event);
    assert.equal(shown.version, 2);
    service.updatePreferences({ enabled: false, theme: 'dark' });
    await service.capture(event);
    assert.equal(shown, undefined);
  } finally {
    await service.close();
    assert.equal(timers.size, 0);
  }
}
