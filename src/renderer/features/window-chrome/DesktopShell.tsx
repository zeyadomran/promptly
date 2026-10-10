import type { ReactNode } from 'react';

import { TooltipProvider } from '../../components/ui/tooltip';
import { WorkflowWorkspace } from '../compose/WorkflowWorkspace';
import { OnboardingTitleBar } from '../onboarding/OnboardingTitleBar';
import { OnboardingWindow } from '../onboarding/OnboardingWindow';
import { SettingsWindow } from '../settings/components/SettingsWindow';
import { usePreferences } from '../settings/settings-context';
import { useShellNavigation } from './shell-navigation';
import { useWindow } from './use-window';
import { WindowTitleBar } from './WindowTitleBar';

/** Wiki and update controls plug into the shell without taking over library state. */
export function DesktopShell({
  wiki,
  updateControl,
  updateVisible
}: {
  wiki?: ReactNode;
  updateControl?: ReactNode;
  updateVisible?: boolean | undefined;
}) {
  const { mode, setMode, error } = useWindow();
  const preferences = usePreferences();
  const navigation = useShellNavigation();
  const onboardingWindow = window.location.hash === '#onboarding';

  return (
    <TooltipProvider>
      <div className="desktop-shell" data-view={navigation.view} data-mode={mode}>
        {onboardingWindow ? (
          <OnboardingTitleBar />
        ) : (
          <WindowTitleBar
            mode={mode}
            setMode={(next) => {
              void setMode(next);
            }}
            updateControl={updateControl}
            updateVisible={updateVisible}
          />
        )}
        <div className="desktop-content">
          {onboardingWindow ? (
            <OnboardingWindow />
          ) : (
            <>
              <WorkflowWorkspace mode={mode} onModeChange={setMode} />
              {navigation.view === 'settings' && <SettingsWindow />}
              {navigation.view === 'wiki' &&
                (wiki ?? (
                  <div className="wiki-unavailable" role="status">
                    The in-app wiki is not available in this build yet.
                  </div>
                ))}
            </>
          )}
        </div>
        {!onboardingWindow && (error ?? preferences.error?.message) !== undefined && (
          <p className="px-4 text-destructive" role="alert">
            {error ?? preferences.error?.message}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
