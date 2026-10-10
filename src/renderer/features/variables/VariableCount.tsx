import './variable-count.css';

import { BracesIcon } from 'lucide-react';

import { usePreferences } from '../settings/settings-context';

export function VariableCount({ count }: { count: number | undefined }) {
  const { settings } = usePreferences();

  if (!settings.promptVariables || count === undefined || count === 0) return null;
  const label = count > 32 ? '32+' : String(count);

  return (
    <span
      className="variable-count"
      title={`${label} ${count === 1 ? 'value' : 'values'} to fill`}
      aria-label={`${label} ${count === 1 ? 'variable' : 'variables'} to fill`}
    >
      <BracesIcon aria-hidden="true" />
      {label}
    </span>
  );
}
