import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { SnippetText } from './SnippetText';

it('renders script-shaped snippets and HTML payloads as literal text', () => {
  const text = '<script>window.xss = true</script><img src=x onerror="window.xss=true">';
  const { container } = render(<SnippetText text={text} />);

  expect(screen.getByText(text)).toBeVisible();
  expect(container.querySelector('script, img')).toBeNull();
});
