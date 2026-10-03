import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { PinStatus } from '../../components/shared/PinStatus';
import { useLibrary } from '../library/library-context';
import { usePreferences } from '../settings/settings-context';

export function RegularFooter() {
  const { state } = useLibrary();
  const { settings } = usePreferences();

  return (
    <footer className="library-footer regular-footer">
      <div className="regular-keyboard-hints">
        <span>
          <kbd>
            {shortcutLabel(settings.localShortcuts.previous, window.promptly.platform)}{' '}
            {shortcutLabel(settings.localShortcuts.next, window.promptly.platform)}
          </kbd>{' '}
          navigate
        </span>
        <span>
          <kbd>{shortcutLabel(settings.localShortcuts.copy, window.promptly.platform)}</kbd> copy
        </span>
        <span>
          <kbd>{shortcutLabel(settings.localShortcuts.tag, window.promptly.platform)}</kbd> tag
        </span>
        <span>
          <kbd>{shortcutLabel(settings.localShortcuts.delete, window.promptly.platform)}</kbd>{' '}
          remove
        </span>
      </div>
      <div className="regular-footer-status">
        <PinStatus pinned={settings.alwaysOnTop} />
        <span aria-live="polite">
          {state.total} of {state.unfilteredTotal}
        </span>
      </div>
    </footer>
  );
}
