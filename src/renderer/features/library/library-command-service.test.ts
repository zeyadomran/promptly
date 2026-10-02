import { expect, it, vi } from 'vitest';

import { LibraryCommandService } from './library-command-service';

it('keeps partial copy as copied for1500ms and refreshes reads without replaying IPC', async () => {
  vi.useFakeTimers();
  const requests: string[] = [];
  let selected: string | null = 'owned-id';
  let refreshed = false;
  const commands = new LibraryCommandService(
    {
      copySnippet: ({ id }) => {
        requests.push(id);
        return Promise.resolve({
          ok: true,
          value: { status: 'copied', id, warnings: ['STATISTICS_UNCONFIRMED', 'WINDOW_NOT_HIDDEN'] }
        });
      },
      deleteSnippet: () => Promise.reject(new Error('Unused external operation')),
      undoDeleteSnippet: () => Promise.reject(new Error('Unused external operation'))
    },
    {
      selectedId: () => selected,
      refresh: () => {
        refreshed = true;
      },
      deleted: () => undefined
    }
  );

  try {
    await commands.copy('owned-id');
    selected = null;
    expect(commands.snapshot()).toMatchObject({ copiedId: 'owned-id' });
    expect(commands.snapshot().error).toContain('Copied.');
    expect(refreshed).toBe(true);
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
