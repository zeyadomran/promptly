import type { KeyboardEvent } from 'react';

import type { PreparedCopy, VariableAnswers } from '../../../shared/contracts/workflow-copy';
import { FieldGroup } from '../../components/ui/field';
import { VariableField } from './VariableField';

export function VariableFields({
  variables,
  values,
  pending,
  change,
  leaveBlank,
  confirm,
  bundle = false
}: {
  variables: PreparedCopy['variables'];
  values: VariableAnswers;
  pending: boolean;
  bundle?: boolean;
  change: (name: string, value: string) => void;
  leaveBlank: (name: string, enabled: boolean) => void;
  confirm: (returnToApp: boolean) => void;
}) {
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      pending ||
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.key !== 'Enter' ||
      event.altKey ||
      event.metaKey ||
      event.getModifierState('AltGraph')
    )
      return;
    if (!(event.target instanceof HTMLTextAreaElement)) return;
    if (event.shiftKey && !event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    const fields = [
      ...event.currentTarget.querySelectorAll<HTMLTextAreaElement>('[data-variable-name]')
    ];
    const next = fields[fields.indexOf(event.target) + 1];

    if (event.ctrlKey || next === undefined) confirm(event.ctrlKey && event.shiftKey);
    else next.focus();
  };

  return (
    <FieldGroup onKeyDown={keyDown}>
      {variables.map((variable) => (
        <VariableField
          key={variable.name}
          variable={variable}
          answer={Object.hasOwn(values, variable.name) ? values[variable.name] : undefined}
          pending={pending}
          bundle={bundle}
          change={(value) => {
            change(variable.name, value);
          }}
          leaveBlank={(enabled) => {
            leaveBlank(variable.name, enabled);
          }}
        />
      ))}
    </FieldGroup>
  );
}
