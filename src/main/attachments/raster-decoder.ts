import type { BrowserWindow } from 'electron';

import { assetLimits, rasterSchema } from '../../shared/contracts/attachments';
import { imageHeader, isPng, previewable } from './image-header';
import { rasterInSandbox } from './raster-script';
import { rasterWindow } from './raster-window';

/** One active decode, bounded waiting requests, timeout and explicit disposal. */
export class RasterDecoder {
  private window: BrowserWindow | undefined;
  private ready: Promise<void> | undefined;
  private tail: Promise<unknown> = Promise.resolve();
  private closing = false;
  private waiting = 0;
  private disposeWindow(): void {
    const window = this.window;

    this.window = undefined;
    this.ready = undefined;
    try {
      if (window !== undefined && !window.isDestroyed()) window.destroy();
    } catch {
      // Timeout/close must settle even if Chromium already retired its window.
    }
  }
  raster(bytes: Uint8Array, edge: number) {
    const dimensions = imageHeader(bytes);

    if (
      this.closing ||
      this.waiting >= 16 ||
      bytes.byteLength < 1 ||
      bytes.byteLength > assetLimits.bytes ||
      !previewable(dimensions) ||
      !Number.isInteger(edge) ||
      edge < 1 ||
      edge > 4096
    )
      return Promise.reject(new Error('Raster unavailable or exceeds limits'));
    const owned = new Uint8Array(bytes);

    this.waiting++;
    const task = this.tail
      .then(() => {
        if (this.closing) throw new Error('Raster decoder closed');
        return this.decode(owned, edge, dimensions);
      })
      .finally(() => {
        this.waiting--;
      });

    this.tail = task.catch(() => undefined);
    return task;
  }
  private async decode(
    bytes: Uint8Array,
    edge: number,
    dimensions: { width: number; height: number }
  ) {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        this.disposeWindow();
        reject(new Error('Raster timeout'));
      }, 10_000);
    });

    try {
      const action = async () => {
        if (this.window === undefined || this.window.isDestroyed()) {
          const created = rasterWindow();

          this.window = created.window;
          this.ready = created.ready;
        }

        const window = this.window;

        await this.ready;
        if (window.isDestroyed()) throw new Error('Raster window retired');
        const input = {
          base64: Buffer.from(bytes).toString('base64'),
          ...dimensions,
          edge,
          maxBytes: assetLimits.bytes
        };
        const decoded: unknown = await window.webContents.executeJavaScript(
          `(${rasterInSandbox.toString()})(${JSON.stringify(input)})`
        );

        if (
          typeof decoded !== 'object' ||
          decoded === null ||
          !('base64' in decoded) ||
          typeof decoded.base64 !== 'string' ||
          decoded.base64.length > Math.ceil(assetLimits.bytes / 3) * 4 ||
          !('width' in decoded) ||
          !('height' in decoded)
        )
          throw new Error('Invalid decoder response');
        const png = new Uint8Array(Buffer.from(decoded.base64, 'base64'));
        const result = rasterSchema.parse({ png, width: decoded.width, height: decoded.height });
        const header = imageHeader(png);

        if (
          !isPng(png) ||
          !previewable(header) ||
          header.width !== result.width ||
          header.height !== result.height ||
          Math.max(result.width, result.height) > edge
        )
          throw new Error('Invalid decoded PNG');
        return result;
      };

      return await Promise.race([action(), timeout]);
    } catch (error) {
      this.disposeWindow();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  async close(): Promise<void> {
    this.closing = true;
    await this.tail;
    this.disposeWindow();
  }
}
