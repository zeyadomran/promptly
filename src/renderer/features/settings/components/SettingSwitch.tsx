import type { SettingsPatch } from '../../../../shared/contracts/settings';
import { Switch } from '../../../components/ui/switch';
import { usePreferenceMutation } from '../hooks/use-preference-mutation';
import { SettingsRow } from './SettingsRow';

export function SettingSwitch({
  label,
  description,
  checked,
  disabled = false,
  patch
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  patch: (checked: boolean) => SettingsPatch;
}) {
  const mutation = usePreferenceMutation();

  return (
    <SettingsRow
      label={label}
      description={description}
      inline
      disabled={disabled}
      {...(mutation.error === undefined ? {} : { error: mutation.error })}
    >
      <Switch
        checked={checked}
        disabled={disabled || mutation.pending}
        aria-busy={mutation.pending}
        aria-disabled={disabled || mutation.pending}
        onCheckedChange={(value) => {
          if (disabled || mutation.pending) return;
          void mutation.apply(patch(value));
        }}
      />
    </SettingsRow>
  );
}
