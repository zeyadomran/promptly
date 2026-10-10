import { expect, it, vi } from 'vitest';

import { QueueModel } from './queue-model';
import { queueModelFixture } from './queue-model-test-fixture';

it('retains queue order on rejected writes, discards stale detail and owns confirmed action feedback', async () => {
  const fixture = queueModelFixture();
  const model = new QueueModel(fixture.bridge);
  const settle = async (read: () => unknown, expected: unknown) =>
    vi.waitFor(() => {
      expect(read()).toEqual(expected);
    });

  try {
    model.start();
    await settle(() => model.snapshot().selectedId, fixture.first.id);
    fixture.holdFirstRead();
    model.select(fixture.first.id);
    model.select(fixture.second.id);
    await settle(() => model.snapshot().detail?.id, fixture.second.id);
    fixture.release();
    await Promise.resolve();
    expect(model.snapshot().detail?.id).toBe(fixture.second.id);
    model.select(fixture.first.id);
    await settle(() => model.snapshot().detail?.id, fixture.first.id);
    fixture.holdRead(fixture.second.id);
    fixture.emit();
    const revealing = model.reveal(fixture.second.id);

    fixture.emit(); // The held full read is now older than the observed change as well.
    await settle(() => model.snapshot().loading, false);
    fixture.release();
    await revealing;
    expect(model.snapshot().selectedId).toBe(fixture.second.id);
    expect(model.snapshot().detail?.id).toBe(fixture.second.id);
    fixture.rejectWrites = true;
    await model.complete(fixture.second.id);
    expect(model.snapshot().selectedId).toBe(fixture.second.id);
    expect(model.snapshot().items.map((item) => item.id)).toEqual([
      fixture.first.id,
      fixture.second.id
    ]);
    expect(model.snapshot().error).toBe('Owned write failure');
    fixture.rejectWrites = false;
    await model.move(fixture.second.id, -1);
    expect(model.snapshot().items.map((item) => item.id)).toEqual([
      fixture.second.id,
      fixture.first.id
    ]);
    expect(model.snapshot().announcement).toBe('Moved to position 1 of 2');
    await model.complete(fixture.second.id);
    expect(model.snapshot().selectedId).toBe(fixture.first.id);
    expect(model.snapshot().toast?.kind).toBe('completion');
    await model.undo();
    expect(model.snapshot().selectedId).toBe(fixture.second.id);
    expect(model.snapshot().tab).toBe('open');
    await model.saveLibrary(fixture.second.id);
    expect(model.snapshot().toast).toMatchObject({ kind: 'saved', snippetId: fixture.snippetId });
    expect(model.snapshot().items).toHaveLength(2);
    await model.delete(fixture.second.id);
    expect(model.snapshot().toast?.kind).toBe('delete');
    await model.undo();
    expect(model.snapshot().detail?.text).toBe('Second full text');
    await model.complete(fixture.second.id);
    await model.reveal(fixture.second.id);
    expect(model.snapshot().tab).toBe('done');
    expect(model.snapshot().detail?.id).toBe(fixture.second.id);
    await model.complete(fixture.second.id);
    await model.reveal(fixture.second.id);
    expect(model.snapshot().tab).toBe('open');
    expect(model.snapshot().selectedId).toBe(fixture.second.id);
    model.close();
    model.start();
    await settle(() => model.snapshot().loading, false);
    expect(model.snapshot().items).toHaveLength(2);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    model.copied(fixture.second.id, {
      status: 'copied',
      sourceIds: [{ kind: 'queue', id: fixture.second.id }],
      attachmentCount: 1,
      returned: 'unavailable',
      warnings: ['STATISTICS_UNCONFIRMED']
    });
    expect(model.snapshot().toast).toMatchObject({
      kind: 'copied',
      outcome: { attachmentCount: 1, returned: 'unavailable', warnings: ['STATISTICS_UNCONFIRMED'] }
    });
    expect(model.snapshot().openCount).toBe(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(model.snapshot().toast).toBeUndefined();
    vi.useRealTimers();
    fixture.emit('clear');
    await settle(() => model.snapshot().items.length, 0);
    expect(model.snapshot().selectedId).toBeNull();
    expect(model.snapshot().detail).toBeNull();
    expect(model.snapshot().toast).toBeUndefined();
  } finally {
    model.close();
    vi.useRealTimers();
  }
});
