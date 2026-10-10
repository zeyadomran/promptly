import type { ContextSeparator } from '../../../shared/contracts/workflow-copy';

export interface BundleEntry {
  id: string;
  label: string;
  fingerprint: string;
  changed: boolean;
  missing: boolean;
}
export interface BundleState {
  active: boolean;
  entries: BundleEntry[];
  separator: ContextSeparator;
  reviewing: boolean;
  pending: boolean;
  hiddenCount: number;
  error: string | undefined;
}
export const emptyBundleState = (): BundleState => ({
  active: false,
  entries: [],
  separator: 'blank-line',
  reviewing: false,
  pending: false,
  hiddenCount: 0,
  error: undefined
});
