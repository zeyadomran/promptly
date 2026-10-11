import { useSyncExternalStore } from 'react';

import { workflowLimits } from '../../../shared/contracts/workflow-copy';
import { Button } from '../../components/ui/button';
import type { BundleModel } from './bundle-model';

export function BundleBar({
  model,
  cancel,
  review,
  matching = false,
  matchError
}: {
  model: BundleModel;
  cancel: () => void;
  review: () => void;
  matching?: boolean;
  matchError?: string | undefined;
}) {
  const state = useSyncExternalStore(model.subscribe, model.snapshot);

  if (!state.active || state.reviewing) return null;
  return (
    <div className="bundle-bar" role="region" aria-label="Selected context snippets">
      <span role="status">
        {state.entries.length} selected
        {matching
          ? ' · Checking filter…'
          : matchError === undefined && state.hiddenCount > 0
            ? ` · ${String(state.hiddenCount)} not shown`
            : ''}
      </span>
      {state.entries.length === workflowLimits.sources && <span>Limit of 20 reached</span>}
      <Button
        variant="ghost"
        size="sm"
        disabled={state.pending}
        onClick={() => {
          model.clear();
        }}
      >
        Clear
      </Button>
      <Button variant="ghost" size="sm" disabled={state.pending} onClick={cancel}>
        Cancel
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={state.pending || state.entries.length < 2}
        onClick={review}
      >
        Review bundle
      </Button>
      {state.error !== undefined && (
        <span role="alert" className="workflow-error">
          {state.error}
        </span>
      )}
      {matchError !== undefined && (
        <span role="alert" className="workflow-error">
          {matchError}
        </span>
      )}
    </div>
  );
}
