// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { nativeFrameBytes, selectionUnits } from '../../../shared/contracts/native-selection';
import { NdjsonFrames } from './ndjson-frames';

describe('bounded UTF-8 NDJSON', () => {
  it('retains exact Unicode split across bytes and independent frames', () => {
    const bytes = Buffer.from(JSON.stringify({ text: '雪🙂\u0001\n"' }) + '\n{}\n');
    const frames = new NdjsonFrames();
    const received: unknown[] = [];

    for (const byte of bytes) received.push(...frames.push(Buffer.from([byte])));
    expect(received).toEqual([{ text: '雪🙂\u0001\n"' }, {}]);
    frames.finish();
  });

  it('accepts the full six-byte escaping bound without truncation', () => {
    const text = '\u0001'.repeat(selectionUnits);
    const frame = Buffer.from(JSON.stringify({ text }) + '\n');

    expect(frame.length).toBeLessThan(nativeFrameBytes);
    expect(new NdjsonFrames().push(frame)).toEqual([{ text }]);
  });

  it('rejects oversized, malformed UTF-8/JSON and partial EOF', () => {
    expect(() => new NdjsonFrames().push(Buffer.alloc(nativeFrameBytes + 1, 32))).toThrow(
      'oversizedFrame'
    );
    expect(() => new NdjsonFrames().push(Buffer.from([0xff, 10]))).toThrow();
    expect(() => new NdjsonFrames().push(Buffer.from('invalid\n'))).toThrow();
    const incomplete = new NdjsonFrames();

    incomplete.push(Buffer.from('{}'));
    expect(() => {
      incomplete.finish();
    }).toThrow('partialFrame');
  });
});
