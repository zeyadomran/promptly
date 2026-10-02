import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

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
