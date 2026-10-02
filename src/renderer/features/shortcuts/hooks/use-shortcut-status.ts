import { useEffect, useState } from 'react';

import type { ShortcutStatus } from '../../../../shared/contracts/shortcuts';

export function useShortcutStatus(revision: number, phase: string) {
  const [status, setStatus] = useState<ShortcutStatus>();

  useEffect(() => {
    let current = true;
    let latest = 0;
    const refresh = async () => {
      const request = ++latest;

      try {
        const result = await window.promptly.getShortcutStatus({});

        if (current && request === latest) setStatus(result.ok ? result.value : undefined);
      } catch {
        if (current && request === latest) setStatus(undefined);
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 1000);

    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [revision, phase]);
  return status;
}
