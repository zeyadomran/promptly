import { PinStatus } from '../../components/shared/PinStatus';
import { usePreferences } from '../settings/settings-context';
import { LibraryKeyboardHints } from './LibraryKeyboardHints';

export function LibraryFooter() {
  const { settings } = usePreferences();

  return (
    <footer className="library-footer">
      <LibraryKeyboardHints />
      <PinStatus pinned={settings.alwaysOnTop} />
    </footer>
  );
}
