import { expect, it } from 'vitest';

import { ComposeModel } from '../renderer/features/compose/compose-model';
import { assemblyFixture } from './assembly-test-fixture';

it('keeps one exact compose draft through entry and lifecycle replay, and retains it after rejected save', async () => {
  const fixture = assemblyFixture();
  const compose = new ComposeModel(fixture.bridge);

  try {
    compose.start();
    await compose.open('queue', { fromGlobal: true });
    expect(compose.snapshot().draft).toMatchObject({ destination: 'queue', fromGlobal: true });
    const original = compose.snapshot().draft;

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
  } finally {
    compose.close();
    await fixture.dispose();
  }
});
