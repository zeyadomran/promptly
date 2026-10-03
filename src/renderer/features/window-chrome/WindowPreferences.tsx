import { Pin } from 'lucide-react';

import { IconButton } from '../../components/shared/IconButton';
import { usePreferences } from '../settings/settings-context';

export function WindowPreferences() {
  const { settings, update } = usePreferences();

  return (
    <IconButton
      label="Always on top"
      icon={Pin}
      aria-pressed={settings.alwaysOnTop}
      className={settings.alwaysOnTop ? 'bg-muted' : 'text-muted-foreground'}
      onClick={() => {
        void update({ alwaysOnTop: !settings.alwaysOnTop });
      }}
    />
  );
}
