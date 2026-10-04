import type { SettingsPatch } from '../../../../shared/contracts/settings';
import { SegmentedControl } from '../../../components/shared/SegmentedControl';
import { ToggleGroupItem } from '../../../components/ui/toggle-group';
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
      {...(mutation.error === undefined ? {} : { error: mutation.error })}
    >
      <SegmentedControl
        value={value}
        aria-label={label}
        aria-busy={mutation.pending}
        aria-disabled={mutation.pending}
        className="settings-choice"
        onValueChange={(next) => {
          if (mutation.pending || !choices.some((choice) => choice.value === next)) return;
          const change = patch(next);

          if (change !== undefined) void mutation.apply(change);
        }}
      >
        {choices.map((choice) => (
          <ToggleGroupItem key={choice.value} value={choice.value} aria-disabled={mutation.pending}>
            {choice.label}
          </ToggleGroupItem>
        ))}
      </SegmentedControl>
    </SettingsRow>
  );
}
