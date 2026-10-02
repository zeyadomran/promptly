// @vitest-environment node
import { expect, test, vi } from 'vitest';

import { fixtureStages } from '../../experiments/native-capture/fixture-stages.mjs';

function marker(stage, fields = {}) {
  return `${JSON.stringify({ kind: 'owned-fixture-stage', stage, elapsedMs: 12, ...fields })}\n`;
}

test('split markers retain only safe stages, native/driver timings and exception codes', () => {
  const stages = fixtureStages(() => 30);
  const frame = Buffer.from(marker('mainEntered'));

  stages.read(frame.subarray(0, 5));
  stages.read(frame.subarray(5));
  stages.read(Buffer.from(`private selection\n${marker('failed', { hresult: -2146233088 })}`));
  expect(stages.snapshot()).toEqual([
    { stage: 'mainEntered', elapsedMs: 12, observedMs: 30 },
    { stage: 'failed', elapsedMs: 12, observedMs: 30, hresult: -2146233088 }
  ]);
  expect(JSON.stringify(stages.snapshot())).not.toContain('private');
});

test('unknown names/fields and invalid numeric markers cannot leak arbitrary stderr', () => {
  const stages = fixtureStages(() => 30);

  for (const frame of [
    marker('private'),
    marker('shown', { text: 'private' }),
    marker('shown', { elapsedMs: -1 }),
    marker('shown', { elapsedMs: 'private' }),
    marker('failed', { hresult: 2147483648 }),
    marker('failed', { hresult: 'private' })
  ])
    stages.read(Buffer.from(frame));
  expect(stages.snapshot()).toEqual([]);
});

test('oversized stderr exhausts a fixed byte budget and later chunks are not decoded', () => {
  const stages = fixtureStages(() => 30);
  const late = Buffer.from(marker('shown'));
  const slice = vi.spyOn(late, 'subarray');

  stages.read(Buffer.alloc(16384, 120));
  stages.read(late);
  expect(slice).not.toHaveBeenCalled();
  expect(stages.snapshot()).toEqual([]);
});

test('stage retention stops at32 validated entries', () => {
  const stages = fixtureStages(() => 30);

  stages.read(Buffer.from(marker('shown').repeat(40)));
  expect(stages.snapshot()).toHaveLength(32);
});
