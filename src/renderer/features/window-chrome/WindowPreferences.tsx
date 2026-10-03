import { Monitor, Moon, Pin, Sun } from 'lucide-react';

import { IconButton } from '../../components/shared/IconButton';
import { usePreferences } from '../settings/settings-context';

export function WindowPreferences() {
  const { settings, update } = usePreferences();
  const nextTheme =
    settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'system' : 'light';
  const ThemeIcon = nextTheme === 'light' ? Sun : nextTheme === 'dark' ? Moon : Monitor;
  const pin = () => {
    void update({ alwaysOnTop: !settings.alwaysOnTop });
  };

  const theme = () => {
    void update({ theme: nextTheme });
  };

  return (
    <>
      <IconButton
        label="Always on top"
        icon={Pin}
        aria-pressed={settings.alwaysOnTop}
        className={settings.alwaysOnTop ? 'bg-muted' : 'text-muted-foreground'}
        onClick={pin}
      />
      <IconButton label={`Use ${nextTheme} theme`} icon={ThemeIcon} onClick={theme} />
    </>
  );
}
