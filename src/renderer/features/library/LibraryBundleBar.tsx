import { BundleBar } from '../bundles/BundleBar';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useLibrary } from './library-context';
import { useBundleMatches } from './use-bundle-matches';

/** Mounted outside the result state so hidden selections remain reviewable. */
export function LibraryBundleBar() {
  const workflow = useWorkflowCopy();
  const { state } = useLibrary();
  const matches = useBundleMatches(workflow.bundle, workflow.bundleState, state);

  return (
    <BundleBar
      model={workflow.bundle}
      matching={matches.pending}
      matchError={matches.error}
      review={() => {
        workflow.bundle.review();
      }}
    />
  );
}
