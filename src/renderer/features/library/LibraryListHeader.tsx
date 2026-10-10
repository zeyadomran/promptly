import '../bundles/bundle-selection.css';

import { LayersIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { usePreferences } from '../settings/settings-context';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
import { LibrarySort } from './LibrarySort';

export function LibraryListHeader() {
  const { state } = useLibrary();
  const workflow = useWorkflowCopy();
  const { settings } = usePreferences();
  const display = libraryDisplay(state);
  const filtered =
    display.request.query.trim() !== '' ||
    display.request.tagIds.length > 0 ||
    display.request.untagged;

  return (
    <>
      <div className="library-list-header">
        <span aria-live="polite">
          {filtered
            ? `${String(display.total)} of ${String(state.unfilteredTotal)}`
            : `${String(display.total)} snippets`}
        </span>
        <div className="library-list-tools">
          {!workflow.bundleState.active && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                workflow.startBundle();
              }}
              title={settings.localShortcuts.bundle ?? undefined}
            >
              <LayersIcon />
              Bundle
            </Button>
          )}
          <LibrarySort />
        </div>
      </div>
      {workflow.bundleState.active && !workflow.bundleState.reviewing && (
        <div className="bundle-selection-banner" role="status">
          <span>Select snippets to combine.</span>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              workflow.cancelBundle();
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </>
  );
}
