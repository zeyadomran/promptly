import { Switch } from '../../components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { useLoginStatus } from '../settings/hooks/use-login-status';
import type { usePreferenceMutation } from '../settings/hooks/use-preference-mutation';
import { useWindowRecovery } from '../settings/hooks/use-window-recovery';
import { usePreferences } from '../settings/settings-context';
import { OnboardingThemeTile } from './OnboardingThemeTile';

export function PreferencesStep({
  mutation
}: {
  mutation: ReturnType<typeof usePreferenceMutation>;
}) {
  const preferences = usePreferences();
  const login = useLoginStatus(preferences.revision);
  const recovery = useWindowRecovery();

  return (
    <div className="onboarding-step-body">
      <h1 tabIndex={-1}>Make it yours.</h1>
      <div className="onboarding-theme-tiles" aria-label="Theme">
        {(['light', 'dark', 'system'] as const).map((theme, index) => (
          <OnboardingThemeTile
            key={theme}
            theme={theme}
            index={index + 1}
            selected={preferences.settings.theme === theme}
            disabled={mutation.pending}
            onChoose={() => {
              void mutation.apply({ theme });
            }}
          />
        ))}
      </div>
      <div className="onboarding-preferences-card">
        <div className="onboarding-preference-row">
          <label htmlFor="onboarding-login">Launch at login</label>
          <Switch
            id="onboarding-login"
            checked={login?.available === true && login.enabled}
            disabled={mutation.pending || login?.available !== true}
            onCheckedChange={(launchAtLogin) => {
              void mutation.apply({ launchAtLogin });
            }}
          />
        </div>
        <div className="onboarding-preference-row">
          <label htmlFor="onboarding-tray">Show in system tray</label>
          <Switch
            id="onboarding-tray"
            checked={recovery?.tray === true}
            disabled={mutation.pending || recovery?.trayController !== true}
            onCheckedChange={(showInTray) => {
              void mutation.apply({ showInTray });
            }}
          />
        </div>
        <div className="onboarding-preference-row">
          <span id="onboarding-size">Start in</span>
          <ToggleGroup
            type="single"
            aria-labelledby="onboarding-size"
            value={preferences.settings.defaultSizeMode}
            onValueChange={(defaultSizeMode) => {
              if (
                !mutation.pending &&
                (defaultSizeMode === 'compact' || defaultSizeMode === 'regular')
              )
                void mutation.apply({ defaultSizeMode });
            }}
          >
            <ToggleGroupItem value="compact" disabled={mutation.pending}>
              Compact
            </ToggleGroupItem>
            <ToggleGroupItem value="regular" disabled={mutation.pending}>
              Regular
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {(login?.available !== true || recovery?.trayController !== true) && (
        <p className="onboarding-description">
          Some system controls are unavailable. Your saved preferences are retained.
        </p>
      )}
      {mutation.error !== undefined && (
        <p className="onboarding-error" role="alert">
          {mutation.error}
        </p>
      )}
    </div>
  );
}
