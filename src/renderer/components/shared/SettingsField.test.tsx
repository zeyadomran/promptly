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

it('announces a rejected preference inline and associates its error with the control', () => {
  render(
    <SettingsField
      label="Launch at login"
      description="Sign-in preference"
      error="Native operation rejected"
    >
      <Input />
    </SettingsField>
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Native operation rejected');
  expect(screen.getByLabelText('Launch at login')).toHaveAccessibleDescription(
    'Sign-in preference Native operation rejected'
  );
  expect(screen.getByLabelText('Launch at login')).toHaveAttribute('aria-invalid', 'true');
});
