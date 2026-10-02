import type { VisibleOnAllWorkspacesOptions } from 'electron';
import { expect, it, vi } from 'vitest';

import { setPinnedWorkspaces } from './pinned-workspaces';

it.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false]
])(
  'preserves Dock visibility %s while pin becomes %s and retains native collection hints',
  (initialDock, pinned) => {
    let dock = initialDock;
    const window = {
      setVisibleOnAllWorkspaces: vi.fn(
        (_visible: boolean, options?: VisibleOnAllWorkspacesOptions) => {
          // Electron44.5.1 invokes DockHide/Show unless the process transformation is skipped.
          if (options?.skipTransformProcessType !== true)
            dock = options?.visibleOnFullScreen !== true;
        }
      )
    };

    setPinnedWorkspaces(window, pinned, 'darwin');
    expect(dock).toBe(initialDock);
    expect(window.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(pinned, {
      visibleOnFullScreen: pinned,
      skipTransformProcessType: true
    });
  }
);

it('does not use a macOS workspace API for Windows pinning', () => {
  const window = { setVisibleOnAllWorkspaces: vi.fn() };

  setPinnedWorkspaces(window, true, 'win32');
  expect(window.setVisibleOnAllWorkspaces).not.toHaveBeenCalled();
});
