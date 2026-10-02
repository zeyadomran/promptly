import { useEffect, useState } from 'react';

import type { DesktopBridge } from '../../../../shared/contracts/desktop-bridge';
import type { DesktopError } from '../../../../shared/contracts/result';
import {
  defaultSettings,
  type SettingsPatch,
  type SettingsSnapshot
} from '../../../../shared/contracts/settings';
import { useTheme } from '../../../hooks/use-theme';
import { createSettingsClient } from './settings-client';

/** One theme/settings owner per renderer; P20 composes controls around this hook. */
export function useSettings(bridge: DesktopBridge, initial?: SettingsSnapshot) {
  const [snapshot, setSnapshot] = useState(initial ?? { revision: 0, settings: defaultSettings() });
  const [error, setError] = useState<DesktopError>();
  const theme = useTheme(snapshot.settings.theme);

  useEffect(() => createSettingsClient(bridge, setSnapshot, setError, initial), [bridge, initial]);
  return {
    ...snapshot,
    theme,
    error,
    update: async (patch: SettingsPatch) => {
      const result = await bridge.updateSettings(patch);

      setError(result.ok ? undefined : result.error);
      return result;
    }
  };
}
