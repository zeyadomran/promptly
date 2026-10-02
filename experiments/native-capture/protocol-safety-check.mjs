import assert from 'node:assert/strict';
import path from 'node:path';

import { openHelper } from './protocol-client.mjs';
import { selectionUnits } from './protocol-limits.mjs';

const executable = path.join(
  import.meta.dirname,
  'out',
  process.platform === 'win32' ? 'promptly-native.exe' : 'promptly-native'
);
const helper = openHelper(executable, ['--protocol-fixtures']);

try {
  const invalidPids = [
    0,
    -1,
    0.4,
    1.4,
    '1',
    '',
    true,
    false,
    null,
    [],
    {},
    2147483648,
    4294967296,
    Number.MAX_SAFE_INTEGER
  ];
  const invalidTextOptions = [0, 1, 'true', 'false', null, [], {}];

  for (const expectedPid of invalidPids) {
    const result = await helper.request('capture', { expectedPid, includeText: true });

    assert.equal(
      result.status,
      'invalidRequest',
      'Supplied invalid PID must fail before OS access'
    );
    assert.equal(result.text, undefined);
  }

  for (const includeText of invalidTextOptions) {
    const result = await helper.request('capture', { includeText });

    assert.equal(
      result.status,
      'invalidRequest',
      'Supplied invalid text option must fail before OS access'
    );
    assert.equal(result.text, undefined);
  }

  assert.equal((await helper.request('fixtureStats')).nativeReads, 0);

  const defaults = await helper.request('fixtureOptions');
  const strict = await helper.request('fixtureOptions', {
    expectedPid: 2147483647,
    includeText: true
  });

  assert.equal(defaults.expectedPid, 0);
  assert.equal(defaults.includeText, false);
  assert.equal(strict.expectedPid, 2147483647);
  assert.equal(strict.includeText, true);

  for (const pattern of ['quotes', 'controls', 'unicode', 'emoji']) {
    for (const units of [0, selectionUnits - 1, selectionUnits, selectionUnits + 1]) {
      const result = await helper.request('fixturePayload', { pattern, units });

      if (units > selectionUnits) {
        assert.equal(result.status, 'selectionTooLarge');
        assert.equal(result.text, undefined);
        continue;
      }

      const expected =
        pattern === 'emoji'
          ? '😀'.repeat(Math.floor(units / 2)) + (units % 2 === 0 ? '' : '雪')
          : (pattern === 'quotes' ? '"' : pattern === 'controls' ? '\u0001' : '雪').repeat(units);

      assert.equal(result.status, 'ok');
      assert.equal(result.characterCount, units);
      assert.equal(result.text.length, units);
      assert.equal(
        result.text === expected,
        true,
        `Synthetic ${pattern} payload must round trip without truncation`
      );
    }
  }

  assert.equal(
    (await helper.request('capabilities')).status,
    'ok',
    'Helper survives all boundary cases'
  );
  assert.equal(
    (await helper.request('fixtureStats')).nativeReads,
    0,
    'Synthetic checks never access native selections'
  );
  await helper.close();
  console.log(
    'Native protocol safety passed: 21 malformed options rejected before OS access; 16 synthetic payload boundaries preserved or rejected explicitly.'
  );
} catch (error) {
  helper.kill();
  throw error;
}
