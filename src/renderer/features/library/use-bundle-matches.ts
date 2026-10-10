import { useEffect, useState, useSyncExternalStore } from 'react';

import { BundleMatchController } from '../bundles/bundle-match-controller';
import type { BundleModel } from '../bundles/bundle-model';
import type { BundleState } from '../bundles/bundle-state';
import type { LibraryState } from './library-state';

/** The worker checks complete filter semantics for only these selected IDs. */
export function useBundleMatches(
  bundle: BundleModel,
  selected: BundleState,
  library: LibraryState
) {
  const [matcher] = useState(
    () =>
      new BundleMatchController(window.promptly, (ids) => {
        bundle.setMatchingIds(ids);
      })
  );
  const status = useSyncExternalStore(matcher.subscribe, matcher.snapshot);
  const key = JSON.stringify({
    ids: selected.entries.map((entry) => entry.id),
    query: library.request.query,
    tagIds: library.request.tagIds,
    untagged: library.request.untagged
  });

  useEffect(() => {
    if (!selected.active || selected.reviewing) return;
    const request = {
      ids: bundle.snapshot().entries.map((entry) => entry.id),
      query: library.request.query,
      tagIds: library.request.tagIds,
      untagged: library.request.untagged
    };

    void matcher.refresh(request);
    return () => {
      matcher.retire();
    };
  }, [bundle, matcher, key, selected.active, selected.reviewing, library.version, library.request]);
  return selected.active && !selected.reviewing && status.key !== key
    ? { pending: true, error: undefined }
    : status;
}
