import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { HighlightedText } from './HighlightedText';

const registry = new Map<string, Set<AbstractRange>>();

beforeEach(() => {
  registry.clear();
  vi.stubGlobal('CSS', { highlights: registry });
  vi.stubGlobal('Highlight', Set);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it('owns each component range independently across updates, unmount and unrelated highlights', () => {
  const unrelated = new Set<AbstractRange>();

  registry.set('another-feature', unrelated);
  const first = render(<HighlightedText text="İ 👋 <b>" ranges={[{ start: 0, end: 1 }]} />);
  const second = render(<HighlightedText text="later" ranges={[{ start: 0, end: 5 }]} />);
  const coverage = () => Array.from(registry.get('promptly-search-text') ?? []);

  expect(coverage()).toHaveLength(2);
  expect(first.container.textContent).toBe('İ 👋 <b>');
  expect(first.container.querySelector('b')).toBeNull();
  expect(first.container.querySelector('span')?.childNodes).toHaveLength(1);
  first.rerender(<HighlightedText text="👋 <b>" ranges={[{ start: 0, end: 2 }]} />);
  expect(coverage()).toHaveLength(2);
  expect(coverage().map((range) => range.endOffset - range.startOffset)).toEqual([5, 2]);
  first.unmount();
  expect(coverage()).toHaveLength(1);
  expect(second.container.textContent).toBe('later');
  expect(registry.get('another-feature')).toBe(unrelated);
  second.unmount();
  expect(registry.has('promptly-search-text')).toBe(false);
  expect(registry.get('another-feature')).toBe(unrelated);
});

it('rejects surrogate-splitting and invalid offsets without changing selectable text', () => {
  const text = '👋 later\u0000END';
  const { container } = render(
    <HighlightedText
      text={text}
      ranges={[
        { start: 1, end: 2 },
        { start: 0, end: 1 },
        { start: -1, end: 4 },
        { start: 3, end: 8 }
      ]}
    />
  );
  const ranges = Array.from(registry.get('promptly-search-text') ?? []);

  expect(ranges).toHaveLength(1);
  expect(ranges[0]?.startOffset).toBe(3);
  const selected = document.createRange();

  selected.selectNodeContents(container);
  expect(selected.toString()).toBe(text);
});
