import { useUpdateProgressStyle } from '../hooks/use-update-progress-style';

export function UpdateProgressBar({ percent }: { percent: number | undefined }) {
  const scope = useUpdateProgressStyle(percent);

  return (
    <div
      className={`update-progress-bar ${scope}`}
      data-indeterminate={percent === undefined}
      role="progressbar"
      aria-label="Update download"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={percent === undefined ? 'Downloading' : undefined}
    >
      <span />
    </div>
  );
}
