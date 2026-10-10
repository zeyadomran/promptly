import { useId } from 'react';

import type { ContextSeparator } from '../../../shared/contracts/workflow-copy';
import { Field, FieldLabel } from '../../components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';

export function BundleSeparator({
  value,
  pending,
  change
}: {
  value: ContextSeparator;
  pending: boolean;
  change: (value: ContextSeparator) => void;
}) {
  const id = useId();

  return (
    <Field>
      <FieldLabel id={id}>Separator</FieldLabel>
      <ToggleGroup
        type="single"
        value={value}
        disabled={pending}
        aria-labelledby={id}
        onValueChange={(next) => {
          if (next === 'blank-line' || next === 'divider' || next === 'tagged') change(next);
        }}
      >
        <ToggleGroupItem value="blank-line">Blank line</ToggleGroupItem>
        <ToggleGroupItem value="divider">Divider</ToggleGroupItem>
        <ToggleGroupItem value="tagged">Tagged</ToggleGroupItem>
      </ToggleGroup>
    </Field>
  );
}
