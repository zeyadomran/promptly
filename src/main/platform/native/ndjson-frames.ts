import { TextDecoder } from 'node:util';

import { nativeFrameBytes } from '../../../shared/contracts/native-selection';

/** Byte bounded framing, including fragmented multibyte Unicode and partial EOF. */
export class NdjsonFrames {
  private buffer = Buffer.alloc(0);
  private readonly decoder = new TextDecoder('utf-8', { fatal: true });

  push(chunk: Buffer): unknown[] {
    const results: unknown[] = [];
    let offset = 0;

    while (offset < chunk.length) {
      const newline = chunk.indexOf(10, offset);
      const end = newline < 0 ? chunk.length : newline;
      const part = chunk.subarray(offset, end);

      if (this.buffer.length + part.length > nativeFrameBytes) throw new Error('oversizedFrame');
      this.buffer = Buffer.concat([this.buffer, part]);
      if (newline < 0) break;
      results.push(JSON.parse(this.decoder.decode(this.buffer)) as unknown);
      this.buffer = Buffer.alloc(0);
      offset = newline + 1;
    }

    return results;
  }

  finish(): void {
    if (this.buffer.length !== 0) throw new Error('partialFrame');
  }
}
