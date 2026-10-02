import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

import { matchRanges } from '../../../shared/search/match-text';
import { findTextMatches } from '../../lib/highlight';
import { HighlightedText } from './HighlightedText';

it('renders hostile HTML as text while preserving the entire snippet', () => {
  const text = '<img src=x onerror="alert(1)"> & <script>bad()</script>';
  const { container } = render(
    <HighlightedText text={text} ranges={findTextMatches(text, 'script')} />
  );

  expect(container.textContent).toBe(text);
  expect(container.querySelector('img, script')).toBeNull();
  expect(container.querySelectorAll('mark')).toHaveLength(2);
});

it('highlights leading and later terms plus every occurrence beyond 512 without losing text', () => {
  const text = `b ${'a '.repeat(700)}b`;
  const { container } = render(
    <HighlightedText text={text} ranges={matchRanges(text, ['a', 'b'])} />
  );

  expect(container.textContent).toBe(text);
  expect(container.querySelectorAll('mark')).toHaveLength(702);
  expect(container.querySelector('mark')).toHaveTextContent('b');
  expect(container.querySelector('mark:last-child')).toHaveTextContent('b');
});
