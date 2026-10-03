import { PinStatus } from '../../components/shared/PinStatus';
import { LibraryKeyboardHints } from '../library/LibraryKeyboardHints';
import { usePreferences } from '../settings/settings-context';

export function RegularFooter() {
  const { settings } = usePreferences();

  return (
    <footer className="library-footer regular-footer">
      <LibraryKeyboardHints regular />
      <PinStatus pinned={settings.alwaysOnTop} />
    </footer>
  );
}
