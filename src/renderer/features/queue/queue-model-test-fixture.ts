import type { ChangeEvent } from '../../../shared/contracts/domain';
import type { QueueItem } from '../../../shared/contracts/queue';
import type { DesktopResult } from '../../../shared/contracts/result';
import type { QueueBridge } from './queue-state';

const timestamp = '2026-10-10T00:00:00.000Z';
const item = (id: string, text: string): QueueItem => ({
  id,
  text,
  tags: [],
  attachments: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: null,
  position: 0,
  copyCount: 0,
  lastCopiedAt: null
});

export function queueModelFixture() {
  const first = item('00000000-0000-4000-8000-000000000001', 'First full text');
  const second = {
    ...item('00000000-0000-4000-8000-000000000002', 'Second full text'),
    position: 1
  };
  const snippetId = '00000000-0000-4000-8000-000000000003';
  let items = [first, second];
  let before = items;
  let revision = 1;
  let hold: string | undefined;
  let release: () => void = () => undefined;
  const listeners = new Set<(event: ChangeEvent) => void>();
  const fixture = {
    first,
    second,
    snippetId,
    rejectWrites: false,
    holdFirstRead: () => {
      hold = first.id;
    },
    holdRead: (id: string) => {
      hold = id;
    },
    release: () => {
      release();
    },
    emit: (cause?: 'clear' | 'import') => {
      if (cause === 'clear') items = [];
      revision += 1;
      for (const listener of listeners)
        listener({ revision, domains: ['queue'], ...(cause === undefined ? {} : { cause }) });
    }
  };
  const failure = () => ({
    ok: false as const,
    error: { code: 'UNAVAILABLE' as const, message: 'Owned write failure' }
  });
  const snapshot = (id: string): DesktopResult<{ revision: number; item: QueueItem }> => {
    const found = items.find((entry) => entry.id === id);

    return found === undefined
      ? { ok: false, error: { code: 'NOT_FOUND', message: 'Missing prompt' } }
      : { ok: true, value: { revision, item: found } };
  };

  const bridge: QueueBridge = {
    listQueue: () =>
      Promise.resolve({
        ok: true,
        value: {
          revision,
          items: items.map((entry) => ({
            ...entry,
            text: entry.text.slice(0, 1024),
            hasText: entry.text.trim().length > 0
          })),
          openCount: items.filter((entry) => entry.completedAt === null).length
        }
      }),
    getQueueItem: ({ id }) => {
      const result = snapshot(id);

      if (hold === id) {
        hold = undefined;
        return new Promise((resolve) => {
          release = () => {
            resolve(result);
          };
        });
      }

      return Promise.resolve(result);
    },
    subscribeChanges: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reorderQueueItems: ({ ids }) => {
      if (fixture.rejectWrites) return Promise.resolve(failure());
      items = ids.flatMap((id, position) => {
        const found = items.find((entry) => entry.id === id);

        return found === undefined ? [] : [{ ...found, position }];
      });
      return Promise.resolve({ ok: true, value: { revision: ++revision } });
    },
    setQueueItemCompleted: ({ id, completed }) => {
      if (fixture.rejectWrites) return Promise.resolve(failure());
      before = items;
      items = items.map((entry) =>
        entry.id === id ? { ...entry, completedAt: completed ? timestamp : null } : entry
      );
      revision += 1;
      const result = snapshot(id);

      return Promise.resolve(
        result.ok ? { ok: true, value: { ...result.value, undoToken: snippetId } } : result
      );
    },
    undoQueueCompletion: () => {
      items = before;
      revision += 1;
      return Promise.resolve(snapshot(second.id));
    },
    deleteQueueItem: ({ id }) => {
      before = items;
      items = items.filter((entry) => entry.id !== id);
      return Promise.resolve({ ok: true, value: { revision: ++revision, undoToken: snippetId } });
    },
    undoDeleteQueueItem: () => {
      items = before;
      revision += 1;
      return Promise.resolve(snapshot(second.id));
    },
    saveQueueItemToLibrary: () =>
      Promise.resolve({
        ok: true,
        value: {
          revision,
          snippet: {
            id: snippetId,
            text: second.text,
            tags: [],
            attachments: [],
            createdAt: timestamp,
            updatedAt: timestamp,
            copyCount: 0,
            lastCopiedAt: null,
            sourceApp: null,
            sourceAppId: null
          }
        }
      })
  };

  return {
    ...fixture,
    get rejectWrites() {
      return fixture.rejectWrites;
    },
    set rejectWrites(value: boolean) {
      fixture.rejectWrites = value;
    },
    bridge
  };
}
