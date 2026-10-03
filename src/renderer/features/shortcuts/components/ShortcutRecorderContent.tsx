import { Plus } from 'lucide-react';

import { ShortcutKey } from '../../../components/shared/ShortcutKey';
import { ShortcutKeycaps } from './ShortcutKeycaps';

export function ShortcutRecorderContent({
  value,
  candidate,
  preview,
  active,
  phase
}: {
  value: string | null;
  candidate: string | undefined;
  preview: string | undefined;
  active: boolean;
  phase: string;
}) {
  if (phase === 'saving') return 'Applying';
  if (candidate !== undefined || (active && preview !== undefined && preview !== ''))
    return (
      <>
        <ShortcutKeycaps
          accelerator={candidate ?? preview ?? ''}
          platform={window.promptly.platform}
        />
        {active && (
          <ShortcutKey className="shortcut-candidate-placeholder" aria-hidden="true">
            _
          </ShortcutKey>
        )}
      </>
    );
  if (active)
    return (
      <span className="shortcut-recording-prompt" role="status">
        <span aria-hidden="true" />
        {phase === 'starting' ? 'Starting' : 'Press keys'}
      </span>
    );
  if (value === null)
    return (
      <>
        <Plus aria-hidden="true" />
        <span className="shortcut-add-label">Add shortcut</span>
      </>
    );
  return (
    <>
      <ShortcutKeycaps accelerator={value} platform={window.promptly.platform} />
      <span className="shortcut-change-label">Change</span>
    </>
  );
}
