import { EventEmitter } from 'node:events';

import type { WebContents } from 'electron';
import { expect, it, vi } from 'vitest';

import { recorderServices } from './ipc-services';
import { shortcutFixture } from './shortcut-test-fixture';

it.each(['destroyed', 'render-process-gone', 'did-start-navigation'])(
  'releases only the caller on renderer %s',
  async (event) => {
    const fixture = shortcutFixture(vi.fn);
    const contents = Object.assign(new EventEmitter(), { id: 10 });
    const other = Object.assign(new EventEmitter(), { id: 20 });
    const service = recorderServices(fixture.shortcuts);

    await fixture.shortcuts.controller.apply(fixture.settings);
    await service(contents as WebContents).setShortcutRecording({ active: true });
    await service(other as WebContents).setShortcutRecording({ active: true });
    contents.emit(event, {}, 'owned:fixture', false, true);
    expect(fixture.shortcuts.status.recording).toBe(true);
    other.emit('destroyed');
    expect(fixture.shortcuts.status.recording).toBe(false);
    expect(fixture.api.setSuspended).toHaveBeenLastCalledWith(false);
  }
);
