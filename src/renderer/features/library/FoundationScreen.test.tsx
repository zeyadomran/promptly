import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FoundationScreen } from './FoundationScreen';

describe('foundation status', () => {
  it.each([
    ['win32', 'Windows'],
    ['darwin', 'macOS']
  ] as const)(
    'shows truthful platform status on %s without implying capture works',
    (platform, name) => {
      render(<FoundationScreen platform={platform} />);
      expect(screen.getByRole('heading', { name: 'Promptly' })).toBeVisible();
      expect(screen.getByRole('status')).toHaveTextContent(`ready on ${name}`);
      expect(screen.getByRole('status')).toHaveTextContent('coming next');
    }
  );
});
