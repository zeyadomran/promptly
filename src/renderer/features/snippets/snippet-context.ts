import { createContext, useContext } from 'react';

import type { SnippetSession } from './snippet-session';
import type { SnippetSessionState } from './snippet-session-state';

export const SnippetContext = createContext<
  | {
      session: SnippetSession;
      state: SnippetSessionState;
    }
  | undefined
>(undefined);

export function useSnippetSession() {
  const value = useContext(SnippetContext);

  if (value === undefined) throw new Error('Snippet provider is missing.');
  return value;
}
