import { useRef, useState } from 'react';

import { type SettingsPatch, settingsSchema } from '../../../../shared/contracts/settings';
import { shortcutConflict } from '../../../../shared/shortcuts/conflicts';
import { usePreferences } from '../../settings/settings-context';

export function useShortcutPreferences() {
  const preferences = usePreferences();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const apply = async (patch: SettingsPatch) => {
    if (busy.current) throw new Error('Wait for the current shortcut change to finish.');
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const candidate = settingsSchema.safeParse({ ...preferences.settings, ...patch });

      if (!candidate.success) throw new Error('Use a valid modifier and key combination.');
      const conflict = shortcutConflict(candidate.data, window.promptly.platform);

      if (conflict !== undefined) throw new Error(conflict);
      const result = await preferences.update(patch);

      if (!result.ok) throw new Error(result.error.message);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to change this shortcut.';

      setError(message);
      throw new Error(message, { cause: caught });
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return { ...preferences, pending, error, apply };
}
