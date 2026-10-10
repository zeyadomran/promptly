import type { ReactNode } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { QueueContext } from './queue-context';
import { QueueModel } from './queue-model';

export function QueueProvider({ children }: { children: ReactNode }) {
  const [model] = useState(() => new QueueModel(window.promptly));
  const state = useSyncExternalStore(model.subscribe, model.snapshot);

  useEffect(() => {
    model.start();
    return () => {
      model.close();
    };
  }, [model]);
  return <QueueContext value={{ state, model }}>{children}</QueueContext>;
}
