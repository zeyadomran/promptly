import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';

export function ShortcutStatusIndicator({
  state,
  label,
  detail
}: {
  state: 'registered' | 'unavailable' | 'neutral';
  label: string;
  detail: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="shortcut-status" data-status={state} role="status">
          <span className="shortcut-status-dot" aria-hidden="true" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="shortcut-status-tooltip">{detail}</TooltipContent>
    </Tooltip>
  );
}
