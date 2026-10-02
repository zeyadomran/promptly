import { useEffect, useState } from 'react';

import type { WindowRecoveryState } from '../../../../shared/contracts/window';
import { usePreferences } from '../settings-context';

export function useWindowRecovery() {
  const { revision } = usePreferences();
  const [status, setStatus] = useState<WindowRecoveryState>();

  useEffect(() => {
    let current = true;
    const refresh = async () => {
      const result = await window.promptly.getWindowRecovery({});

      if (current) setStatus(result.ok ? result.value : undefined);
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 1000);

    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [revision]);
  return status;
}
