import { expect, it } from 'vitest';

import { ComposeModel } from '../renderer/features/compose/compose-model';
import { assemblyFixture } from './assembly-test-fixture';

it('keeps one exact compose draft through entry and lifecycle replay, and retains it after rejected save', async () => {
  let now = new Date('2026-10-10T00:00:00Z');
  const fixture = assemblyFixture(() => now);
  const compose = new ComposeModel(fixture.bridge);

  try {
    compose.start();
    await compose.open('queue', { fromGlobal: true });
    expect(compose.snapshot().draft).toMatchObject({ destination: 'queue', fromGlobal: true });
    const original = compose.snapshot().draft;

    if (original === undefined) throw new Error('Draft missing');
    const intake = await fixture.bridge.chooseAttachments({ draftToken: original.draftToken });

    if (!intake.ok) throw new Error('Attachment intake failed');
    compose.refreshAttachments(intake.value.attachments);

    compose.changeText('  raw\r\n{{answer}}  ');
    await compose.open('library');
    compose.close();
    compose.start();
    expect(compose.snapshot().draft).toMatchObject({
      id: original?.id,
      destination: 'queue',
      text: '  raw\r\n{{answer}}  '
    });
    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_compose BEFORE INSERT ON queue_items BEGIN SELECT RAISE(ABORT,'Owned save failure'); END;"
    );
    expect(await compose.save()).toBe(false);
    expect(compose.snapshot().draft?.text).toBe('  raw\r\n{{answer}}  ');
    fixture.store.engine.context.db.exec('DROP TRIGGER reject_compose');
    compose.subscribe(() => {
      throw new Error('Owned observer failure');
    });
    expect(await compose.save()).toBe(true);
    expect(compose.snapshot().draft).toBeUndefined();
    expect(fixture.clipboard).toEqual([]);
    fixture.store.reopen();
    expect(fixture.store.invoke('listQueue', {}).items).toMatchObject([
      { text: '  raw\r\n{{answer}}  ' }
    ]);
    const saved = compose.snapshot().saved;

    if (saved === undefined) throw new Error('Save feedback missing');
    expect(fixture.store.invoke('getQueueItem', { id: saved.id }).item.text).toBe(
      '  raw\r\n{{answer}}  '
    );
    await compose.editQueue(saved.id);
    const editing = compose.snapshot().draft;

    if (editing === undefined) throw new Error('Edit draft missing');
    compose.changeText('  retained after deletion\r\n');
    fixture.store.invoke('deleteQueueItem', { id: saved.id });
    now = new Date(now.getTime() + 31_000);
    expect(await compose.save()).toBe(false);
    expect(compose.snapshot().draft).toMatchObject({
      id: editing.id,
      draftToken: editing.draftToken,
      text: '  retained after deletion\r\n',
      source: undefined,
      attachments: intake.value.attachments
    });
    expect(compose.snapshot().error).toBe(
      'The queued prompt was deleted. Your draft is kept. Save it as a new prompt or choose Library.'
    );
    compose.changeDestination('library');
    expect(await compose.save()).toBe(true);
    const recovered = compose.snapshot().saved;

    if (recovered === undefined) throw new Error('Recovered save missing');
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: recovered.id }).snippet).toMatchObject({
      text: '  retained after deletion\r\n',
      attachments: intake.value.attachments
    });
    expect(fixture.clipboard).toEqual([]);
  } finally {
    compose.close();
    await fixture.dispose();
  }
});
