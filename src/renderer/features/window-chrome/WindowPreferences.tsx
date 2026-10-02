import { Monitor, Moon, Pin, Sun } from 'lucide-react';

import type { SizeMode } from '../../../shared/contracts/window';
import { IconButton } from '../../components/shared/IconButton';
import { Button } from '../../components/ui/button';
import { usePreferences } from '../settings/settings-context';

export function WindowPreferences({ mode }: { mode: SizeMode }) {
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

  if (mode === 'compact')
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
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={settings.alwaysOnTop}
        className={settings.alwaysOnTop ? 'bg-muted' : 'text-muted-foreground'}
        onClick={pin}
      >
        <Pin aria-hidden="true" />
        Always on top
      </Button>
      <Button variant="ghost" size="sm" aria-label={`Use ${nextTheme} theme`} onClick={theme}>
        <ThemeIcon aria-hidden="true" />
        {nextTheme[0]?.toUpperCase()}
        {nextTheme.slice(1)}
      </Button>
    </>
  );
}
