import type { RefObject } from 'react';
import { createContext, useContext } from 'react';

import type { LibraryModel } from './library-model';
import type { LibraryState } from './library-state';

export interface LibrarySelectionPort {
  readonly hasSearch: boolean;
  selectedId: string | null;
  select(id: string): void;
  moveSelection(delta: number): Promise<void>;
  focusSearch(): void;
  clearSearch(): void;
}
export interface LibrarySession {
  scroll: Map<string, { top: number; index: number; reveal: number; query: string }>;
  model: LibraryModel;
  state: LibraryState;
  searchRef: RefObject<HTMLInputElement | null>;
  selection: LibrarySelectionPort;
}
export const LibraryContext = createContext<LibrarySession | undefined>(undefined);
export function useLibrary() {
  const session = useContext(LibraryContext);

  if (session === undefined) throw new Error('Library provider is missing.');
  return session;
}

export function useLibrarySelection(): LibrarySelectionPort {
  return useLibrary().selection;
}
