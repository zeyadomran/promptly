import { expect, it, vi } from 'vitest';

import type { CopyOutcome } from '../../../shared/contracts/copy';
import type { DesktopResult } from '../../../shared/contracts/result';
import { LibraryCommandService } from './library-command-service';

it('notifies a confirmed partial copy for 1500ms and refreshes reads without replaying IPC', async () => {
  vi.useFakeTimers();
  const requests: string[] = [];
  let selected: string | null = 'owned-id';
  let refreshed = false;
  const notifications: string[] = [];
  const commands = new LibraryCommandService(
    {
      copySnippet: ({ id }) => {
        requests.push(id);
        return Promise.resolve({
          ok: true,
          value: { status: 'copied', id, warnings: ['STATISTICS_UNCONFIRMED'] }
        });
      },
      deleteSnippet: () => Promise.reject(new Error('Unused external operation')),
      undoDeleteSnippet: () => Promise.reject(new Error('Unused external operation'))
    },
    {
      selectedId: () => selected,
      copied: () => {
        notifications.push('Copied');
      },
      refresh: () => {
        refreshed = true;
      },
      deleted: () => undefined
    }
  );

  try {
    await commands.copy('owned-id', 'markdown');
    selected = null;
    expect(commands.snapshot()).toMatchObject({ copiedId: 'owned-id' });
    expect(commands.snapshot().error).toContain('Copied.');
    expect(refreshed).toBe(true);
    expect(notifications).toEqual(['Copied']);
    await vi.advanceTimersByTimeAsync(1499);
    expect(commands.snapshot().copiedId).toBe('owned-id');
    await vi.advanceTimersByTimeAsync(1);
    expect(commands.snapshot().copiedId).toBeNull();
    expect(requests).toEqual(['owned-id']);
  } finally {
    commands.close();
    vi.useRealTimers();
  }
});

it('keeps failures and uncertain copies honest and never announces success or replays a busy gesture', async () => {
  const requests: string[] = [];
  const notifications: string[] = [];
  let selected = 'owned-id';
  let release: (result: DesktopResult<CopyOutcome>) => void = () => undefined;
  let uncertain = false;
  const commands = new LibraryCommandService(
    {
      copySnippet: ({ id }) => {
        requests.push(id);
        return uncertain
          ? Promise.reject(new Error('Owned IPC disconnected'))
          : new Promise((resolve) => {
              release = resolve;
            });
      },
      deleteSnippet: () => Promise.reject(new Error('Unused external operation')),
      undoDeleteSnippet: () => Promise.reject(new Error('Unused external operation'))
    },
    {
      selectedId: () => selected,
      copied: () => {
        notifications.push('Copied');
      },
      refresh: () => undefined,
      deleted: () => undefined
    }
  );

  try {
    const copying = commands.copy('owned-id');

    await commands.copy('owned-id');
    release({ ok: false, error: { code: 'UNAVAILABLE', message: 'Clipboard unavailable.' } });
    await copying;
    expect(commands.snapshot()).toEqual({ copiedId: null, error: 'Clipboard unavailable.' });
    uncertain = true;
    await commands.copy('owned-id');
    expect(commands.snapshot().copiedId).toBeNull();
    expect(commands.snapshot().error).toContain('Copy could not be confirmed.');
    expect(notifications).toEqual([]);
    uncertain = false;
    const accepted = commands.copy('owned-id');

    selected = 'later-selection';
    release({ ok: true, value: { status: 'copied', id: 'owned-id', warnings: [] } });
    await accepted;
    expect(commands.snapshot()).toEqual({ copiedId: 'owned-id', error: undefined });
    expect(selected).toBe('later-selection');
    expect(notifications).toEqual(['Copied']);
    selected = 'owned-id';
    uncertain = true;
    await commands.copy('owned-id');
    expect(commands.snapshot().copiedId).toBeNull();
    expect(notifications).toEqual(['Copied']);
    expect(requests).toEqual(['owned-id', 'owned-id', 'owned-id', 'owned-id']);
  } finally {
    commands.close();
  }
});
