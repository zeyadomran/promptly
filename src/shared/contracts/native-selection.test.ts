import { describe, expect, it } from 'vitest';

import { nativeCaptureSchema, nativeForegroundSchema } from './native-selection';

const selected = {
  v: 1,
  id: '1',
  status: 'ok',
  source: null,
  identity: 'a'.repeat(32),
  targetIntegrityLevel: 8192,
  text: '雪🙂\nsecond',
  characterCount: 10,
  elapsedMs: 1.5
};

describe('native selection reply validation', () => {
  it('keeps exact text and nullable provenance', () => {
    expect(nativeCaptureSchema.parse(selected).status).toBe('ok');
    expect(nativeCaptureSchema.parse({ ...selected, text: '   ', characterCount: 3 }).status).toBe(
      'ok'
    );
  });

  it('rejects truncated counts, unsafe provenance, nonfinite timings and text on failures', () => {
    expect(nativeCaptureSchema.safeParse({ ...selected, characterCount: 9 }).success).toBe(false);
    expect(
      nativeCaptureSchema.safeParse({
        ...selected,
        source: { pid: 1, name: 'app', id: '../app.exe' }
      }).success
    ).toBe(false);
    expect(nativeCaptureSchema.safeParse({ ...selected, elapsedMs: Infinity }).success).toBe(false);
    expect(
      nativeCaptureSchema.safeParse({ ...selected, status: 'foregroundChanged' }).success
    ).toBe(false);
    expect(
      nativeForegroundSchema.safeParse({ v: 1, id: '1', status: 'ok', source: null, identity: '1' })
        .success
    ).toBe(false);
  });

  it.each(['empty', 'unsupported', 'permissionDenied', 'secureInput', 'foregroundChanged'])(
    'keeps %s distinct',
    (status) => {
      expect(nativeCaptureSchema.parse({ v: 1, id: '1', status }).status).toBe(status);
    }
  );
});
