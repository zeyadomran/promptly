import { useRef, useState } from 'react';

import type { SettingsPatch } from '../../../../shared/contracts/settings';
import { usePreferences } from '../settings-context';

/** Display only committed values; each row owns its pending state and recoverable error. */
export function usePreferenceMutation() {
  const { update } = usePreferences();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const apply = async (patch: SettingsPatch) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const result = await update(patch);

      if (!result.ok) setError(result.error.message);
    } catch {
      setError('Unable to change this preference. Try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return { pending, error, apply };
}
