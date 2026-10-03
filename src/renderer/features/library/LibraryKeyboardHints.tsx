import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { usePreferences } from '../settings/settings-context';

export function LibraryKeyboardHints({ regular = false }: { regular?: boolean }) {
  const { settings } = usePreferences();
  const label = (binding: string) =>
    shortcutLabel(binding, window.promptly.platform)
      .replace('DELETE', 'Del')
      .replace('BACKSPACE', 'Backspace')
      .replace('TAB', 'Tab');

  return (
    <div className="library-keyboard-hints">
      {regular && (
        <span>
          <kbd>
            {label(settings.localShortcuts.previous)} {label(settings.localShortcuts.next)}
          </kbd>{' '}
          navigate
        </span>
      )}
      <span>
        <kbd>{label(settings.localShortcuts.copy)}</kbd> copy
      </span>
      <span>
        <kbd>{label(settings.localShortcuts.tag)}</kbd> tag
      </span>
      {regular && (
        <span>
          <kbd>{label(settings.localShortcuts.delete)}</kbd> remove
        </span>
      )}
    </div>
  );
}
