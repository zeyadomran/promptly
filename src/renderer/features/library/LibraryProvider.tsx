import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { LibraryContext } from './library-context';
import { LibraryModel } from './library-model';

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [model] = useState(() => new LibraryModel(window.promptly));
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    model.start();
    return () => {
      model.close();
    };
  }, [model]);
  return (
    <LibraryContext
      value={{
        model,
        state,
        searchRef,
        selection: {
          hasSearch: state.request.query.length > 0,
          selectedId: state.selectedId,
          select: (id) => {
            const index = state.cache.indexOf(id);

            if (index !== undefined) model.select(id, index);
          },
          moveSelection: (delta) => model.moveSelection(delta),
          focusSearch: () => {
            searchRef.current?.focus();
          },
          clearSearch: () => {
            model.query({ ...state.request, query: '' });
          }
        }
      }}
    >
      {children}
    </LibraryContext>
  );
}
