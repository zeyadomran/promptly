import type { SettingsPatch } from '../../../../shared/contracts/settings';
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';
import { usePreferenceMutation } from '../hooks/use-preference-mutation';
import { SettingsRow } from './SettingsRow';

export function SettingChoice({
  label,
  description,
  value,
  choices,
  patch
}: {
  label: string;
  description: string;
  value: string;
  choices: readonly { value: string; label: string }[];
  patch: (value: string) => SettingsPatch | undefined;
}) {
  const mutation = usePreferenceMutation();

  return (
    <SettingsRow
      label={label}
      description={description}
      disabled={mutation.pending}
      {...(mutation.error === undefined ? {} : { error: mutation.error })}
    >
      <ToggleGroup
        type="single"
        value={value}
        className="settings-choice"
        onValueChange={(next) => {
          if (!choices.some((choice) => choice.value === next)) return;
          const change = patch(next);

          if (change !== undefined) void mutation.apply(change);
        }}
      >
        {choices.map((choice) => (
          <ToggleGroupItem key={choice.value} value={choice.value}>
            {choice.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </SettingsRow>
  );
}
