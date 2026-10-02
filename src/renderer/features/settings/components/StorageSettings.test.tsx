import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { StorageSettings } from './StorageSettings';

const preview = {
  token: 'c2089c73-8a17-4c5d-8b42-0b6559937789',
  revision: 4,
  snippets: 2,
  tags: 1,
  memberships: 2,
  remappedSnippetIds: 1,
  remappedTagIds: 0,
  coalescedTags: 1
};
const cancel = vi.fn();
const confirm = vi.fn();

beforeEach(() => {
  cancel.mockResolvedValue({ ok: true, value: {} });
  confirm.mockResolvedValue({ ok: true, value: { revision: 5 } });
  vi.stubGlobal('promptly', {
    platform: 'win32',
    getStorageLocation: () => Promise.resolve({ ok: true, value: { directory: 'owned/data' } }),
    previewLibraryImport: () =>
      Promise.resolve({ ok: true, value: { status: 'preview', preview } }),
    cancelLibraryImport: cancel,
    confirmLibraryImport: confirm
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function openPreview() {
  render(<StorageSettings />);
  const launch = screen.getByRole('button', { name: 'Import JSON…' });

  launch.focus();
  fireEvent.click(launch);
  await screen.findByRole('dialog');
  return launch;
}

it.each(['Cancel', 'Escape'])(
  'dismisses an expired preview with %s and returns focus',
  async (method) => {
    // The real main-owned preview expires after five minutes and returns NOT_FOUND.
    cancel.mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Expired preview.' }
    });
    const launch = await openPreview();

    if (method === 'Escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    else fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(cancel).toHaveBeenCalledWith({ token: preview.token });
    await waitFor(() => expect(launch).toHaveFocus());
  }
);

it.each(['success', 'stale'])('returns keyboard focus after %s confirmation', async (outcome) => {
  if (outcome === 'stale')
    confirm.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'Library changed. Choose again.' }
    });
  const launch = await openPreview();

  fireEvent.click(screen.getByRole('button', { name: /^Import$/u }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(launch).toHaveFocus());
  if (outcome === 'stale') expect(screen.getByRole('alert')).toHaveTextContent('Library changed');
});
