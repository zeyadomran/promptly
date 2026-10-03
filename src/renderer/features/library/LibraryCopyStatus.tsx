import { Check, CornerDownLeft } from 'lucide-react';

import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { usePreferences } from '../settings/settings-context';

export function LibraryCopyStatus({ copied }: { copied: boolean }) {
  const { settings } = usePreferences();

  return (
    <span className="library-row-action" aria-live="polite">
      {copied ? (
        <>
          <Check className="size-3" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <CornerDownLeft className="size-3" aria-hidden="true" />
          <span className="sr-only">
            Press {shortcutLabel(settings.localShortcuts.copy, window.promptly.platform)} to copy
          </span>
        </>
      )}
    </span>
  );
}
