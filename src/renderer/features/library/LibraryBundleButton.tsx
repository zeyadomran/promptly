import { LayersIcon } from 'lucide-react';

import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { usePreferences } from '../settings/settings-context';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';

export function LibraryBundleButton() {
  const workflow = useWorkflowCopy();
  const { settings } = usePreferences();
  const binding = settings.localShortcuts.bundle;

  if (workflow.bundleState.active) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Bundle snippets"
          onClick={() => {
            workflow.startBundle();
          }}
        >
          <LayersIcon aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Bundle snippets
        {binding === null ? '' : ` (${shortcutLabel(binding, window.promptly.platform)})`}
      </TooltipContent>
    </Tooltip>
  );
}
