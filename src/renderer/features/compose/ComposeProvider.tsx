import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { WorkflowSaveOutcome } from '../../../shared/contracts/workflow-save';
import { useSnippetSession } from '../snippets/snippet-context';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { ComposeContext } from './compose-context';
import { ComposeModel } from './compose-model';
import type { ComposeDestination } from './compose-state';
import { ComposeDraftChoiceDialog } from './ComposeDraftChoiceDialog';

export function ComposeProvider({
  children,
  onSaved
}: {
  children: ReactNode;
  onSaved?: (saved: WorkflowSaveOutcome) => Promise<void>;
}) {
  const [model] = useState(() => new ComposeModel(window.promptly));
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const navigation = useShellNavigation();
  const copy = useWorkflowCopy();
  const { session, requestExit } = useSnippetSession();
  const command = useRef(0);
  const savedCallback = useRef(onSaved);

  useEffect(() => {
    savedCallback.current = onSaved;
  }, [onSaved]);
  const focus = () => {
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[data-compose-text]')?.focus()
    );
  };

  const guard = async () => {
    if (model.snapshot().draft !== undefined) return true;
    const view = navigation.view;

    if (session.snapshot().editing) navigation.showLibrary();
    const allowed = await requestExit();

    if (allowed && view === 'queue') navigation.showQueue();
    return allowed;
  };

  const open = async (destination: ComposeDestination, options?: { fromGlobal?: boolean }) => {
    if (await guard()) {
      copy.cancelBundle();
      await model.open(destination, options);
      focus();
    }
  };

  const editQueue = async (id: string) => {
    if (await guard()) {
      copy.cancelBundle();
      await model.editQueue(id);
      focus();
    }
  };

  const save = async (options?: { return?: boolean }) => {
    const saved = await model.save(options);
    const result = model.snapshot().saved;

    if (saved && result !== undefined) {
      try {
        await savedCallback.current?.(result);
      } catch {
        model.report('Saved. Unable to show the saved entry. Use Show to try again.');
      }
    }

    return saved;
  };

  useEffect(() => {
    model.start();
    const unsubscribe = window.promptly.subscribeChanges((event) => {
      if (event.cause === 'clear') model.resetAfterClear();
    });

    return () => {
      unsubscribe();
      model.close();
    };
  }, [model]);
  useEffect(() => {
    const next = navigation.composeCommand;

    if (next === undefined || next.request === command.current) return;
    command.current = next.request;
    void open(next.destination, { fromGlobal: next.fromGlobal });
  });

  return (
    <ComposeContext value={{ model, state, open, editQueue, save }}>
      {children}
      <ComposeDraftChoiceDialog />
    </ComposeContext>
  );
}
