import { Info } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';

export function ShortcutRow({
  label,
  description,
  dense = false,
  status,
  children
}: {
  label: string;
  description: string;
  dense?: boolean;
  status?: ReactNode;
  children: ReactNode;
}) {
  const descriptionId = useId();

  return (
    <div
      className="shortcut-row"
      data-dense={dense}
      role="group"
      aria-label={label}
      aria-describedby={descriptionId}
    >
      <div className="shortcut-row-label">
        <span>{label}</span>
        {dense && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="shortcut-row-info" aria-label={label + ' details'}>
                <Info aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        )}
        <p id={descriptionId} className={dense ? 'sr-only' : 'shortcut-row-description'}>
          {description}
        </p>
      </div>
      <div className="shortcut-row-controls">
        {status}
        {children}
      </div>
    </div>
  );
}
