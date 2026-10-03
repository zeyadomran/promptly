import '../../../styles/updates.css';

import { Button } from '../../../components/ui/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '../../../components/ui/field';
import { updateDescription, updatePercent } from '../hooks/update-presentation';
import { useUpdates } from '../hooks/use-updates';
import { UpdateProgressBar } from './UpdateProgressBar';

export function UpdateSettings() {
  const { state, error, act } = useUpdates();
  const status = state?.status;
  const label =
    status === 'available'
      ? 'Download'
      : status === 'ready'
        ? 'Restart now'
        : status === 'checking'
          ? 'Checking'
          : status === 'updating'
            ? 'Downloading'
            : status === 'error'
              ? 'Retry'
              : 'Check for updates';

  return (
    <Field className="settings-field storage-row update-settings-row" data-inline="true">
      <FieldContent>
        <FieldLabel asChild>
          <h2>Updates</h2>
        </FieldLabel>
        <FieldDescription id="update-status" role="status" aria-live="polite">
          {updateDescription(state, error)}
        </FieldDescription>
        {status === 'updating' && <UpdateProgressBar percent={updatePercent(state)} />}
      </FieldContent>
      <div className="settings-field-control">
        <Button
          variant={status === 'ready' ? 'default' : 'outline'}
          aria-describedby="update-status"
          disabled={
            state === undefined ||
            status === 'checking' ||
            status === 'updating' ||
            status === 'unavailable'
          }
          onClick={() => {
            void act();
          }}
        >
          {label}
        </Button>
      </div>
    </Field>
  );
}
