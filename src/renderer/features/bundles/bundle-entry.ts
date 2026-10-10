import type { DesktopResult } from '../../../shared/contracts/result';
import type { PreparedCopy } from '../../../shared/contracts/workflow-copy';
import type { BundleEntry } from './bundle-state';

export const bundleEntryLabel = (text: string) => text.split(/\r?\n/u, 1)[0]?.slice(0, 160) ?? '';
export function reconcileBundleEntries(
  entries: BundleEntry[],
  prepared: PreparedCopy
): BundleEntry[] {
  return entries.map((entry) => {
    const segment = prepared.segments.find((part) => part.id === entry.id);

    return {
      ...entry,
      label: segment === undefined ? entry.label : bundleEntryLabel(segment.text),
      missing: segment === undefined,
      changed: segment !== undefined && segment.fingerprint !== entry.fingerprint
    };
  });
}

export function refreshedBundleEntry(
  entry: BundleEntry,
  result: DesktopResult<PreparedCopy>
): BundleEntry {
  const segment = result.ok ? result.value.segments[0] : undefined;

  return {
    ...entry,
    missing: !result.ok && result.error.code === 'NOT_FOUND',
    changed: segment !== undefined && segment.fingerprint !== entry.fingerprint,
    label: segment === undefined ? entry.label : bundleEntryLabel(segment.text)
  };
}
