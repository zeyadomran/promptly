import { createContext, useContext } from 'react';

import type { QueueModel } from './queue-model';
import type { QueueState } from './queue-state';

export const QueueContext = createContext<{ state: QueueState; model: QueueModel } | undefined>(
  undefined
);
export function useQueue() {
  const value = useContext(QueueContext);

  if (value === undefined) throw new Error('Queue provider is missing.');
  return value;
}
