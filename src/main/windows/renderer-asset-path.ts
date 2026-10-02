import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Only bundled renderer assets may be read by this isolated session. */
export function rendererAssetPath(url: string, directory: string): string | undefined {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'file:') return undefined;
    const asset = fileURLToPath(parsed);
    const relative = path.relative(directory, asset);

    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      return undefined;
    }

    if (path.extname(asset).toLowerCase() === '.html' && relative !== 'index.html') {
      return undefined;
    }

    return asset;
  } catch {
    return undefined;
  }
}
