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
      disabled={disabled || mutation.pending}
      {...(mutation.error === undefined ? {} : { error: mutation.error })}
    >
      <Switch
        checked={checked}
        onCheckedChange={(value) => {
          void mutation.apply(patch(value));
        }}
      />
    </SettingsRow>
  );
}
