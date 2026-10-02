import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { Input } from '../ui/input';
import { SettingsField } from './SettingsField';

it('connects the label and description to the control and retains prior descriptions', () => {
  render(
    <>
      <p id="existing">Existing hint</p>
      <SettingsField label="Shortcut" description="New hint" invalid disabled>
        <Input aria-describedby="existing" />
      </SettingsField>
    </>
  );

  const control = screen.getByLabelText('Shortcut');

  expect(control).toHaveAccessibleDescription('Existing hint New hint');
  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toBeDisabled();
});
