import { useEffect, useState } from 'react';

import type { LoginStatus } from '../../../../shared/contracts/login-status';

export function useLoginStatus(revision: number): LoginStatus | undefined {
  const [status, setStatus] = useState<LoginStatus>();

  useEffect(() => {
    let current = true;
    let latest = 0;
    const refresh = async () => {
      const request = ++latest;

      try {
        const result = await window.promptly.getLoginStatus({});

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
  }, [revision]);
  return status;
}
