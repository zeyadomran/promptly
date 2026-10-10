import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Button } from '../../components/ui/button';
import { BundleReviewDialog } from '../bundles/BundleReviewDialog';
import { FillValuesDialog } from '../variables/FillValuesDialog';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { WorkflowCopyContext } from './workflow-copy-context';
import { WorkflowCopyController } from './workflow-copy-controller';
import type { WorkflowCopyInput, WorkflowCopyOptions } from './workflow-copy-types';

export function WorkflowCopyProvider({
  children,
  compact = false
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const [controller] = useState(() => new WorkflowCopyController(window.promptly));
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot);
  const bundleState = useSyncExternalStore(controller.bundle.subscribe, controller.bundle.snapshot);
  const navigation = useShellNavigation();
  const copyRequest = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const captureFocus = () => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  const restoreFocus = () => {
    const target = opener.current;

    if (target?.isConnected === true && target.closest('[hidden], [inert]') === null)
      target.focus();
    else document.querySelector<HTMLElement>('[data-promptly-search]')?.focus();
  };

  useEffect(() => {
    controller.start();
    void controller.refreshReturnTarget();
    const unsubscribe = window.promptly.subscribeWindowFocus(() => {
      void controller.refreshReturnTarget();
    });
    const unsubscribeChanges = window.promptly.subscribeChanges((event) => {
      if (event.cause === 'clear') controller.reset();
    });

    return () => {
      unsubscribe();
      unsubscribeChanges();
      controller.close();
    };
  }, [controller]);
  useEffect(() => {
    if (navigation.view !== 'library') controller.cancelBundle();
  }, [controller, navigation.view]);
  useEffect(() => {
    const command = navigation.copyCommand;

    if (command === undefined || command.request === copyRequest.current) return;
    copyRequest.current = command.request;
    controller.cancelBundle();
    captureFocus();
    void controller.requestCopy({ kind: 'snippet', id: command.id }, { format: command.format });
  }, [controller, navigation.copyCommand]);

  return (
    <WorkflowCopyContext
      value={{
        requestCopy: (source: WorkflowCopyInput, options?: WorkflowCopyOptions) => {
          captureFocus();
          return controller.requestCopy(source, options);
        },
        startBundle: () => {
          captureFocus();
          controller.startBundle();
        },
        cancelBundle: controller.cancelBundle,
        bundle: controller.bundle,
        bundleState,
        busy: state.busy,
        error: state.error,
        returnLabel: state.returnLabel,
        clearError: controller.clearError
      }}
    >
      {children}
      <FillValuesDialog
        model={controller.fill}
        compact={compact}
        {...(state.returnLabel === undefined ? {} : { returnLabel: state.returnLabel })}
        visible={state.reviewing}
        restoreFocus={restoreFocus}
      />
      <BundleReviewDialog
        model={controller.bundle}
        fill={controller.fill}
        compact={compact}
        {...(state.returnLabel === undefined ? {} : { returnLabel: state.returnLabel })}
        restoreFocus={restoreFocus}
      />
      {state.feedback !== undefined && (
        <div className="library-copy-toast" role="status">
          {state.feedback}
        </div>
      )}
      {state.error !== undefined && (
        <div className="workflow-copy-error" role="alert">
          <span>{state.error}</span>
          <Button size="xs" variant="ghost" onClick={controller.clearError}>
            Dismiss
          </Button>
        </div>
      )}
    </WorkflowCopyContext>
  );
}
