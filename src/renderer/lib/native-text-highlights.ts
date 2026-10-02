import type { HighlightRange } from './highlight';
import { normalizeHighlightRanges } from './highlight';

const name = 'promptly-search-text';
const documents = new WeakMap<Document, Highlight>();

export function supportsNativeHighlights(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined' &&
    typeof StaticRange !== 'undefined'
  );
}

/** Each caller owns its ranges; cleanup cannot remove another component's coverage. */
export function registerTextHighlights(node: Text, ranges: readonly HighlightRange[]) {
  const document = node.ownerDocument;
  const registry = CSS.highlights;
  let highlight = documents.get(document);

  if (highlight === undefined) {
    highlight = new Highlight();
    documents.set(document, highlight);
  }

  const owned = normalizeHighlightRanges(node.data, ranges).map(
    ({ start, end }) =>
      new StaticRange({
        startContainer: node,
        startOffset: start,
        endContainer: node,
        endOffset: end
      })
  );

  for (const range of owned) highlight.add(range);
  registry.set(name, highlight);
  const registered = highlight;

  return () => {
    for (const range of owned) registered.delete(range);
    if (registered.size === 0 && registry.get(name) === registered) registry.delete(name);
  };
}
