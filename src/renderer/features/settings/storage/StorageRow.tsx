import { type ReactNode, useId } from 'react';

import { Field, FieldContent, FieldDescription, FieldLabel } from '../../../components/ui/field';

export function StorageRow({
  label,
  description,
  children
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  const descriptionId = useId();

  return (
    <Field className="settings-field storage-row" data-inline="false">
      <FieldContent>
        <FieldLabel asChild>
          <h2>{label}</h2>
        </FieldLabel>
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      </FieldContent>
      <div
        className="settings-field-control"
        role="group"
        aria-label={label}
        aria-describedby={descriptionId}
      >
        {children}
      </div>
    </Field>
  );
}
