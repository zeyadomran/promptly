import type { ReactNode } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import type { SizeMode } from '../../../shared/contracts/window';
import { useLibrary } from '../library/library-context';
import { DraftChoiceDialog } from './DraftChoiceDialog';
import { SnippetContext } from './snippet-context';
import { SnippetSession } from './snippet-session';

export function SnippetSessionProvider({
  mode,
  children,
  onModeChange
}: {
  mode: SizeMode;
  children: ReactNode;
  onModeChange: (mode: SizeMode) => Promise<void>;
}) {
  const { state: library } = useLibrary();
  const [session] = useState(() => new SnippetSession(window.promptly));
  const state = useSyncExternalStore(session.subscribe, session.snapshot);

  useEffect(() => {
    session.start();
    const stop = window.promptly.subscribeChanges((event) => {
      if (event.domains.includes('snippets') || event.domains.includes('tags')) session.refresh();
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
    if (mode === 'compact') session.warnModeChange();
  }, [mode, session]);
  return (
    <SnippetContext value={{ session, state }}>
      {children}
      <DraftChoiceDialog resumeEditing={() => onModeChange('regular')} />
    </SnippetContext>
  );
}
