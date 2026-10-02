import { SettingsProvider } from './features/settings/SettingsProvider';
import { DesktopShell } from './features/window-chrome/DesktopShell';

export function App() {
  return (
    <SettingsProvider>
      <DesktopShell />
    </SettingsProvider>
  );
}
