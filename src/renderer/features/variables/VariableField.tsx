import { useId } from 'react';

import type { PreparedCopy, VariableAnswers } from '../../../shared/contracts/workflow-copy';
import { workflowLimits } from '../../../shared/contracts/workflow-copy';
import { Checkbox } from '../../components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '../../components/ui/field';
import { Textarea } from '../../components/ui/textarea';

export function VariableField({
  variable,
  answer,
  pending,
  change,
  leaveBlank,
  bundle = false
}: {
  variable: PreparedCopy['variables'][number];
  answer: VariableAnswers[string] | undefined;
  pending: boolean;
  change: (value: string) => void;
  leaveBlank: (enabled: boolean) => void;
  bundle?: boolean;
}) {
  const id = useId();
  const value = answer?.value ?? '';
  const blank = answer?.leaveBlank === true;

  return (
    <Field data-disabled={pending}>
      <FieldLabel htmlFor={id}>{variable.name}</FieldLabel>
      <Textarea
        id={id}
        data-variable-name={variable.name}
        className="variable-answer"
        rows={1}
        value={value}
        maxLength={workflowLimits.value}
        readOnly={pending}
        aria-describedby={`${id}-hint`}
        aria-invalid={!blank && value === ''}
        onChange={(event) => {
          change(event.target.value);
        }}
      />
      <FieldDescription id={`${id}-hint`}>
        {bundle
          ? `in ${variable.sourceIndexes.join(' and ')}`
          : variable.count > 1
            ? `used ${String(variable.count)} times`
            : 'Used for this copy only'}
        {value.length > 0 && value.trim() === '' ? ' · Only spaces' : ''}
      </FieldDescription>
      <Field orientation="horizontal">
        <Checkbox
          id={`${id}-blank`}
          checked={blank}
          disabled={pending}
          onCheckedChange={(checked) => {
            leaveBlank(checked === true);
          }}
        />
        <FieldLabel htmlFor={`${id}-blank`}>Leave blank</FieldLabel>
      </Field>
    </Field>
  );
}
