import { TriangleAlert } from 'lucide-react';

import { acceleratorKey } from '../../../../shared/shortcuts/accelerator';
import { Button } from '../../../components/ui/button';
import type { useShortcutPreferences } from '../hooks/use-shortcut-preferences';

export function AltSpaceAdvisory({
  preferences,
  disabled
}: {
  preferences: ReturnType<typeof useShortcutPreferences>;
  disabled: boolean;
}) {
  if (
    window.promptly.platform !== 'win32' ||
    acceleratorKey(preferences.settings.openShortcut, 'win32') !== 'alt+space'
  )
    return null;
  return (
    <div className="shortcut-alt-space-advisory">
      <TriangleAlert aria-hidden="true" />
      <p>Windows also uses Alt+Space for its window menu, so some apps may swallow it.</p>
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={disabled}
        onClick={() => {
          void preferences.bind('open', 'Control+Alt+Space').catch(() => undefined);
        }}
      >
        Use Ctrl+Alt+Space
      </Button>
    </div>
  );
}
