import { createContext, useContext } from 'react';

/** Issue19 supplies execution/feedback. Absence never pretends a copy succeeded. */
export interface LibraryCommandsPort {
  copy(id: string, format?: 'text' | 'markdown'): Promise<void>;
  copiedId: string | null;
  error: string | undefined;
}
export interface LibraryTagActions {
  createTag(): void;
  editSelectedTags(id: string): void;
}
export const LibraryCommandsContext = createContext<LibraryCommandsPort | undefined>(undefined);
export const LibraryTagActionsContext = createContext<LibraryTagActions | undefined>(undefined);
export function useLibraryCommands() {
  return useContext(LibraryCommandsContext);
}

export function useLibraryTagActions() {
  return useContext(LibraryTagActionsContext);
}
