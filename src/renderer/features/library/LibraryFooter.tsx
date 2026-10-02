import { PinStatus } from '../../components/shared/PinStatus';
import { usePreferences } from '../settings/settings-context';
import { useLibrary } from './library-context';

export function LibraryFooter() {
  const { state } = useLibrary();
  const { settings } = usePreferences();

  return (
    <footer className="library-footer">
      <span aria-live="polite">
        {state.total} of {state.unfilteredTotal}
      </span>
      <PinStatus pinned={settings.alwaysOnTop} />
    </footer>
  );
}
