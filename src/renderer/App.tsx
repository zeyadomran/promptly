import { SettingsProvider } from './features/settings/SettingsProvider';
import { ConnectedWiki } from './features/wiki/ConnectedWiki';
import { DesktopShell } from './features/window-chrome/DesktopShell';
import { ShellNavigationProvider } from './features/window-chrome/ShellNavigationProvider';

export function App() {
  return (
    <SettingsProvider>
      <ShellNavigationProvider>
        <DesktopShell wiki={<ConnectedWiki />} />
      </ShellNavigationProvider>
    </SettingsProvider>
  );
}
