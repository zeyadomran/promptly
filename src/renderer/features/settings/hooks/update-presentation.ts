import type { UpdateState } from '../../../../shared/contracts/updates';

export function updateDescription(state?: UpdateState, error?: string) {
  if (error !== undefined) return error;
  if (state === undefined) return 'Reading update status…';
  if (state.status !== 'updating') return state.message;
  const progress = state.progress;
  const bytes =
    progress?.transferred !== undefined && progress.total !== undefined
      ? ` — ${(progress.transferred / 1_000_000).toFixed(1)} of ${(progress.total / 1_000_000).toFixed(1)} MB`
      : '';

  return `Downloading Promptly ${state.version ?? ''}${bytes}`.trim();
}

export function updatePercent(state?: UpdateState) {
  if (state?.status !== 'updating') return undefined;
  const progress = state.progress;

  return (
    progress?.percent ??
    (progress?.transferred !== undefined && progress.total !== undefined
      ? (progress.transferred / progress.total) * 100
      : undefined)
  );
}

export const isTitleBarUpdateVisible = (state?: UpdateState) =>
  state !== undefined && ['available', 'updating', 'ready', 'error'].includes(state.status);
