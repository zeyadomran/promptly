// @vitest-environment node
import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { launchSessionSidecar } from '../e2e/session-sidecar';

const owned = vi.hoisted(() => ({
  launch: vi.fn(),
  profile: vi.fn(),
  remove: vi.fn(async () => {}),
  copy: vi.fn(async () => {}),
  child: undefined
}));

vi.mock('node:fs/promises', () => ({
  cp: owned.copy,
  copyFile: owned.copy,
  mkdir: vi.fn(async () => {}),
  mkdtemp: vi.fn(async () => '/owned-copy'),
  realpath: vi.fn(async (value) => value),
  rm: owned.remove,
  writeFile: vi.fn(async () => {})
}));
vi.mock('@playwright/test', () => ({ _electron: { launch: owned.launch } }));
vi.mock('../profile-identity', () => ({ assertProfileIdentity: owned.profile }));

const platform = Object.getOwnPropertyDescriptor(process, 'platform');

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process, 'platform', { value: 'darwin' });
  for (const [key, value] of Object.entries({
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    RUNNER_ENVIRONMENT: 'github-hosted',
    RUNNER_OS: 'macOS'
  }))
    vi.stubEnv(key, value);
  owned.child = Object.assign(new EventEmitter(), { pid: 42, kill: vi.fn(() => true) });
});

afterEach(() => {
  Object.defineProperty(process, 'platform', platform);
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

test('profile assertion failure retains child/launcher outcomes even when launch result never assigns', async () => {
  const primary = new Error('owned profile mismatch');
  const application = {
    evaluate: vi
      .fn()
      .mockResolvedValueOnce('/owned-profile')
      .mockResolvedValueOnce({ observedExit: true }),
    process: () => owned.child,
    close: vi.fn(async () => {
      owned.child.emit('exit', 0, null);
    })
  };
  const outcomes = [];

  owned.launch.mockResolvedValue(application);
  owned.profile.mockRejectedValue(primary);
  await expect(
    launchSessionSidecar({ main: '/built/main', executable: '/built/sidecar' }, (stage, status) =>
      outcomes.push({ stage, status })
    )
  ).rejects.toMatchObject({ cause: primary });
  expect(outcomes).toEqual([
    { stage: 'child', status: 'verified' },
    { stage: 'launcher', status: 'verified' }
  ]);
  expect(application.close).toHaveBeenCalledOnce();
  expect(owned.remove).toHaveBeenCalledWith('/owned-copy', { recursive: true, force: true });
});

test('wedged initial main evaluation is bounded and still records independent launcher retirement', async () => {
  vi.useFakeTimers();
  const application = {
    evaluate: vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockRejectedValueOnce(new Error('owned child unavailable')),
    process: () => owned.child,
    close: vi.fn(async () => {
      owned.child.emit('exit', 0, null);
    })
  };
  const outcomes = [];

  owned.launch.mockResolvedValue(application);
  const launching = launchSessionSidecar(
    { main: '/built/main', executable: '/built/sidecar' },
    (stage, status) => outcomes.push({ stage, status })
  );
  const rejected = expect(launching).rejects.toThrow('Owned session launcher setup failed');

  await vi.advanceTimersByTimeAsync(4001);
  await rejected;
  expect(outcomes).toEqual([
    { stage: 'child', status: 'failed' },
    { stage: 'launcher', status: 'verified' }
  ]);
  expect(application.close).toHaveBeenCalledOnce();
  // The owned copy/profile remains when child retirement could not be established.
  expect(owned.remove.mock.calls.some(([directory]) => directory === '/owned-copy')).toBe(false);
});

test('launch failure without an observable handle retains the owned copy and marks cleanup unverified', async () => {
  const outcomes = [];

  owned.launch.mockRejectedValue(new Error('owned startup failure'));
  await expect(
    launchSessionSidecar({ main: '/built/main', executable: '/built/sidecar' }, (stage, status) =>
      outcomes.push({ stage, status })
    )
  ).rejects.toThrow('Owned session launcher setup failed');
  expect(outcomes).toEqual([{ stage: 'launcher', status: 'failed' }]);
  expect(owned.remove.mock.calls.some(([directory]) => directory === '/owned-copy')).toBe(false);
});
