import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { SizeMode } from '../../../shared/contracts/window';
import { useLibrary } from '../library/library-context';
import { DraftChoiceDialog } from './DraftChoiceDialog';
import { SnippetContext } from './snippet-context';
import { SnippetSession } from './snippet-session';

export function SnippetSessionProvider({
  mode,
  active = true,
  children,
  onModeChange
}: {
  active?: boolean;
  mode: SizeMode;
  children: ReactNode;
  onModeChange: (mode: SizeMode) => Promise<void>;
}) {
  const { state: library } = useLibrary();
  const [session] = useState(() => new SnippetSession(window.promptly));
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const exit = useRef<
    { promise: Promise<boolean>; resolve: (allowed: boolean) => void } | undefined
  >(undefined);
  const requestExit = () => {
    if (!session.snapshot().editing) return Promise.resolve(true);
    if (session.snapshot().pending || session.snapshot().assetPending)
      return Promise.resolve(false);
    if (!session.dirty) return session.requestExit();

    if (exit.current !== undefined) return exit.current.promise;
    let resolveExit: (allowed: boolean) => void = () => undefined;
    const promise = new Promise<boolean>((resolve) => {
      resolveExit = resolve;
    });

    exit.current = { promise, resolve: resolveExit };
    session.warnModeChange();
    return promise;
  };

  useEffect(() => {
    if (exit.current === undefined || (state.prompt && state.editing)) return;
    exit.current.resolve(!state.editing);
    exit.current = undefined;
  }, [state.prompt, state.editing]);

  useEffect(() => {
    session.start();
    const stop = window.promptly.subscribeChanges((event) => {
      if (event.cause === 'clear') session.resetAfterClear();
      else if (event.domains.includes('snippets') || event.domains.includes('tags'))
        session.refresh();
    });

    return () => {
      stop();
      session.close();
    };
  }, [session]);
  useEffect(() => {
    session.select(library.selectedId, library.loading || library.total > 0);
  }, [session, library.selectedId, library.loading, library.total]);
  useEffect(() => {
    if (active && mode === 'compact') session.warnModeChange();
  }, [active, mode, session]);
  return (
    <SnippetContext value={{ session, state, requestExit }}>
      {children}
      <DraftChoiceDialog active={active} resumeEditing={() => onModeChange('regular')} />
    </SnippetContext>
  );
}
