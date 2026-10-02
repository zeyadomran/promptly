// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { operations } from '../../../shared/contracts/operations';
import { macosPermissionServices } from './permission-services';

const open = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('electron', () => ({ shell: { openExternal: open } }));

it('rejects arbitrary destinations at the IPC schema and disables navigation on other platforms', () => {
  for (const request of [
    { permission: 'screenRecording' },
    { permission: 'accessibility', url: 'https://example.com' },
    { permission: '/bin/sh' },
    { permission: 'inputMonitoring', path: '/secret' }
  ]) {
    expect(operations.openMacosPermissionSettings.request.safeParse(request).success).toBe(false);
  }

  expect(macosPermissionServices(undefined)).toEqual({});
  expect(open).not.toHaveBeenCalled();
});
