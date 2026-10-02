import type { ReactNode } from 'react';

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
  return (
    <Field className="settings-field storage-row" data-inline="false">
      <FieldContent>
        <FieldLabel asChild>
          <h2>{label}</h2>
        </FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <div className="settings-field-control">{children}</div>
    </Field>
  );
}
