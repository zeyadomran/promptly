import { useEffect } from 'react';

import { PinStatus } from '../../components/shared/PinStatus';
import { Button } from '../../components/ui/button';
import { TooltipProvider } from '../../components/ui/tooltip';
import { FoundationScreen } from '../library';
import { usePreferences } from '../settings/settings-context';
import { useWindow } from './use-window';
import { WindowSettings } from './WindowSettings';
import { WindowTitleBar } from './WindowTitleBar';

export function DesktopShell() {
  const { mode, setMode, error } = useWindow();
  const preferences = usePreferences();
  const settingsWindow = window.location.hash === '#settings';
  const onboardingWindow = window.location.hash === '#onboarding';

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        void window.promptly.openDesktopWindow({ kind: 'settings' });
      }
    };

    window.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('keydown', keyboard);
    };
  }, []);
  return (
    <TooltipProvider>
      <div className="desktop-shell">
        <WindowTitleBar
          mode={mode}
          setMode={(next) => {
            void setMode(next);
          }}
          {...(settingsWindow
            ? { title: 'Settings' }
            : onboardingWindow
              ? { title: 'Set up Promptly' }
              : {})}
        />
        <div className="desktop-content">
          {settingsWindow ? (
            <WindowSettings />
          ) : (
            <FoundationScreen platform={window.promptly.platform} />
          )}
        </div>
        {(error ?? preferences.error?.message) !== undefined && (
          <p className="px-4 text-destructive" role="alert">
            {error ?? preferences.error?.message}
          </p>
        )}
        <footer className="window-footer">
          <PinStatus pinned={preferences.settings.alwaysOnTop} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void window.promptly.quitApplication({});
            }}
          >
            Quit Promptly
          </Button>
        </footer>
      </div>
    </TooltipProvider>
  );
}
