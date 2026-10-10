import { useLibrary } from './library-context';
import { libraryDisplay } from './library-display';
import { LibrarySort } from './LibrarySort';
import { useBundleMatches } from './use-bundle-matches';

export function LibraryListHeader() {
  const { state } = useLibrary();
  const workflow = useWorkflowCopy();
  const { settings } = usePreferences();
  const matches = useBundleMatches(workflow.bundle, workflow.bundleState, state);
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
      <BundleBar
        model={workflow.bundle}
        matching={matches.pending}
        matchError={matches.error}
        review={() => {
          workflow.bundle.review();
        }}
      />
    </>
  );
}

import { LayersIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { BundleBar } from '../bundles/BundleBar';
import { usePreferences } from '../settings/settings-context';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
