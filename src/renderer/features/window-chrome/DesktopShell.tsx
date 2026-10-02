import { TooltipProvider } from '../../components/ui/tooltip';
import { LibraryWindow } from '../library';
import { OnboardingTitleBar } from '../onboarding/OnboardingTitleBar';
import { OnboardingWindow } from '../onboarding/OnboardingWindow';
import { SettingsTitleBar } from '../settings/components/SettingsTitleBar';
import { SettingsWindow } from '../settings/components/SettingsWindow';
import { usePreferences } from '../settings/settings-context';
import { useWindow } from './use-window';
import { WindowTitleBar } from './WindowTitleBar';

export function DesktopShell() {
  const { mode, setMode, error } = useWindow();
  const preferences = usePreferences();
  const settingsWindow = window.location.hash === '#settings';
  const onboardingWindow = window.location.hash === '#onboarding';

  return (
    <TooltipProvider>
      <div className="desktop-shell">
        {settingsWindow ? (
          <SettingsTitleBar />
        ) : onboardingWindow ? (
          <OnboardingTitleBar />
        ) : (
          <WindowTitleBar
            mode={mode}
            setMode={(next) => {
              void setMode(next);
            }}
          />
        )}
        <div className="desktop-content">
          {settingsWindow ? (
            <SettingsWindow />
          ) : !onboardingWindow ? (
            <LibraryWindow mode={mode} onModeChange={setMode} />
          ) : (
            <OnboardingWindow />
          )}
        </div>
        {!settingsWindow &&
          !onboardingWindow &&
          (error ?? preferences.error?.message) !== undefined && (
            <p className="px-4 text-destructive" role="alert">
              {error ?? preferences.error?.message}
            </p>
          )}
      </div>
    </TooltipProvider>
  );
}
