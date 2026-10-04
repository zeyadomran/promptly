import '../../styles/updates.css';

import { ArrowDownToLine, CircleArrowDown, RotateCw } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import {
  isTitleBarUpdateVisible,
  updateDescription,
  updatePercent
} from '../settings/hooks/update-presentation';
import { useUpdateProgressStyle } from '../settings/hooks/use-update-progress-style';
import { useUpdates } from '../settings/hooks/use-updates';

export function TitleBarUpdate({ compact }: { compact: boolean }) {
  const { state, error, act } = useUpdates();
  const percent = updatePercent(state);
  const scope = useUpdateProgressStyle(percent);

  if (!isTitleBarUpdateVisible(state) || state === undefined) return null;
  const downloading = state.status === 'updating';
  const Icon = downloading
    ? ArrowDownToLine
    : state.status === 'available'
      ? CircleArrowDown
      : RotateCw;
  const label =
    state.status === 'available'
      ? `Update to ${state.version ?? ''}`
      : downloading
        ? 'Downloading'
        : state.status === 'ready'
          ? compact
            ? 'Restart'
            : 'Restart to update'
          : compact
            ? 'Retry update'
            : 'Update failed · Retry';
  const description = updateDescription(state, error);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`titlebar-update ${scope}`}
          data-status={state.status}
          data-compact={compact}
          data-indeterminate={downloading && percent === undefined}
          aria-label={compact && state.status !== 'ready' ? `${label}. ${description}` : label}
          aria-disabled={downloading}
          onClick={() => {
            if (!downloading) void act();
          }}
        >
          {downloading && <span className="titlebar-update-fill" aria-hidden="true" />}
          <span className="titlebar-update-icon" aria-hidden="true">
            <Icon />
          </span>
          {(!compact || state.status === 'ready') && (
            <span className="titlebar-update-label">{label}</span>
          )}
          {!compact && downloading && percent !== undefined && (
            <span className="titlebar-update-percent">{Math.round(percent)}%</span>
          )}
          {compact && state.status === 'available' && (
            <span className="titlebar-update-dot" aria-hidden="true" />
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {description}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
