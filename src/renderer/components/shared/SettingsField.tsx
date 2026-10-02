import { cloneElement, type ComponentProps, type ReactElement, useId } from 'react';

import { cn } from '../../lib/utils';
import { Field, FieldContent, FieldDescription, FieldLabel } from '../ui/field';

interface SettingsFieldProps {
  label: string;
  description?: string;
  inline?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  children: ReactElement<ComponentProps<'input'>>;
}

export function SettingsField({
  label,
  description,
  inline = false,
  disabled = false,
  invalid = false,
  className,
  children
}: SettingsFieldProps) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const descriptionId = `${id}-description`;
  const labelId = `${id}-label`;
  const descriptions = [
    children.props['aria-describedby'],
    description === undefined ? undefined : descriptionId
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Field
      className={cn('settings-field', className)}
      data-inline={inline}
      data-disabled={disabled}
      data-invalid={invalid}
    >
      <FieldContent>
        <FieldLabel id={labelId} htmlFor={id}>
          {label}
        </FieldLabel>
        {description !== undefined && (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        )}
      </FieldContent>
      <div className="settings-field-control">
        {cloneElement(children, {
          id,
          'aria-labelledby': labelId,
          'aria-describedby': descriptions || undefined,
          'aria-invalid': invalid,
          disabled: disabled || children.props.disabled === true
        })}
      </div>
    </Field>
  );
}
