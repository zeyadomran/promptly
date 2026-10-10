import { createContext, useContext } from 'react';

import type { ComposeModel } from './compose-model';
import type { ComposeDestination, ComposeState } from './compose-state';

export interface ComposeContextValue {
  model: ComposeModel;
  state: ComposeState;
  open: (destination: ComposeDestination, options?: { fromGlobal?: boolean }) => Promise<void>;
  editQueue: (id: string) => Promise<void>;
  save: (options?: { return?: boolean }) => Promise<boolean>;
}
export const ComposeContext = createContext<ComposeContextValue | undefined>(undefined);
export function useCompose() {
  const value = useContext(ComposeContext);

  if (value === undefined) throw new Error('Compose provider is missing.');
  return value;
}
