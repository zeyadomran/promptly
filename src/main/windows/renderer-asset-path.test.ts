import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { rendererAssetPath } from './renderer-asset-path';

describe('renderer asset boundary', () => {
  const directory = path.resolve('bundled-renderer');
  const asset = (name: string) => pathToFileURL(path.join(directory, name)).href;

  it('accepts only local assets inside the bundle and its entry HTML', () => {
    expect(rendererAssetPath(`${asset('index.html')}?fixture=1`, directory)).toBe(
      path.join(directory, 'index.html')
    );
    expect(rendererAssetPath(asset('assets/font.woff2'), directory)).toBe(
      path.join(directory, 'assets/font.woff2')
    );
    for (const url of [
      asset('../private.txt'),
      asset('../bundled-renderer-other/private.txt'),
      asset('other.html'),
      asset('other.HTML'),
      pathToFileURL(directory).href,
      'https://example.com/index.html',
      'file:///invalid%00path',
      'not a URL'
    ]) {
      expect(rendererAssetPath(url, directory)).toBeUndefined();
    }
  });
});
