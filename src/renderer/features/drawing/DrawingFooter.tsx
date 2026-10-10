import { CopyIcon, DownloadIcon, SaveIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';
import type { DrawingSession } from './drawing-session';
import type { DrawingState } from './drawing-state';

export function DrawingFooter({
  session,
  state
}: {
  session: DrawingSession;
  state: DrawingState;
}) {
  const empty = state.scene === undefined || state.scene.elements.length === 0;
  const disabled = empty || state.pending !== undefined || state.textAt !== undefined;

  return (
    <footer className="drawing-footer">
      <span className="drawing-footer-hint">
        {empty ? 'Draw something first' : state.dirty ? 'Unsaved drawing' : 'Editable drawing'}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={state.pending !== undefined}
        onClick={() => {
          session.requestClose();
        }}
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          void session.output('export');
        }}
      >
        <DownloadIcon data-icon="inline-start" aria-hidden="true" />
        {state.pending === 'export' ? 'Exporting…' : 'Export PNG…'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          void session.output('copy');
        }}
      >
        <CopyIcon data-icon="inline-start" aria-hidden="true" />
        {state.pending === 'copy' ? 'Copying…' : 'Copy PNG'}
      </Button>
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => {
          void session.output('save');
        }}
      >
        <SaveIcon data-icon="inline-start" aria-hidden="true" />
        {state.pending === 'save' ? 'Saving…' : `Save to ${state.saveTarget}`}
      </Button>
    </footer>
  );
}
