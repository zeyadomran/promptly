import './workflows.css';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { literalBraceSequences } from '../../../shared/workflows/template';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import type { FillModel } from './fill-model';
import { FillValuesActions } from './FillValuesActions';
import { ResolvedPreview } from './ResolvedPreview';
import { VariableFields } from './VariableFields';
import { VariableText } from './VariableText';

export function FillValuesDialog({
  model,
  compact = false,
  returnLabel
}: {
  model: FillModel;
  compact?: boolean;
  returnLabel?: string;
}) {
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const content = useRef<HTMLDivElement>(null);
  const variables = state.prepared?.variables ?? [];

  useEffect(() => {
    if (state.active && state.prepared !== null && state.source?.kind !== 'bundle')
      content.current?.querySelector<HTMLTextAreaElement>('[data-variable-name]')?.focus();
  }, [state.active, state.prepared, state.source?.kind]);
  const otherSequences = state.prepared === null ? 0 : literalBraceSequences(state.prepared.text);
  const confirm = (returnToApp: boolean) => {
    if (returnToApp && returnLabel === undefined) return;
    void model.copy(returnToApp).then((copied) => {
      if (copied) return;
      const name = model.snapshot().unresolved[0];

      [...(content.current?.querySelectorAll<HTMLTextAreaElement>('[data-variable-name]') ?? [])]
        .find((field) => field.dataset['variableName'] === name)
        ?.focus();
    });
  };

  return (
    <Dialog
      open={state.active && state.source?.kind !== 'bundle'}
      onOpenChange={(open) => {
        if (!open && !state.pending) model.cancel();
      }}
    >
      <DialogContent
        ref={content}
        className="workflow-dialog"
        data-compact={compact}
        showCloseButton={!state.pending}
        onOpenAutoFocus={(event) => {
          const field = content.current?.querySelector<HTMLTextAreaElement>('[data-variable-name]');

          if (field !== null && field !== undefined) {
            event.preventDefault();
            field.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (state.pending) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            !event.ctrlKey ||
            event.altKey ||
            event.metaKey ||
            event.key !== 'Enter'
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          confirm(event.shiftKey);
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {variables.length > 0
              ? `Fill in ${String(variables.length)} ${variables.length === 1 ? 'value' : 'values'}`
              : 'Review copy'}
          </DialogTitle>
          <DialogDescription>
            {state.source?.kind === 'draft'
              ? 'Used for this copy only. Your draft is not changed or saved.'
              : state.source?.kind === 'queue'
                ? 'Used for this copy only. The queued prompt is not changed.'
                : 'Used for this copy only. The saved snippet is not changed.'}
          </DialogDescription>
        </DialogHeader>
        {state.loading && <p role="status">Preparing full text…</p>}
        {state.error !== undefined && (
          <p role="alert" className="workflow-error">
            {state.error}
          </p>
        )}
        <VariableFields
          variables={variables}
          values={state.values}
          pending={state.pending || state.loading}
          change={(name, value) => {
            model.change(name, value);
          }}
          leaveBlank={(name, enabled) => {
            model.leaveBlank(name, enabled);
          }}
          confirm={confirm}
        />
        {state.prepared !== null && (
          <>
            <pre className="workflow-annotated-preview" aria-label="Values preview">
              {variables.length > 0 ? (
                <VariableText text={state.prepared.text} values={state.values} />
              ) : (
                state.prepared.text
              )}
            </pre>
            <ResolvedPreview text={state.preview} />
            {otherSequences > 0 && (
              <p className="workflow-note">
                {otherSequences} other {'{{ }}'} sequences are not variables and are copied as
                written.
              </p>
            )}
            {state.prepared.attachmentCount > 0 && (
              <p className="workflow-note">
                Attachments are copied separately. {state.prepared.attachmentCount} attachments are
                not included.
              </p>
            )}
          </>
        )}
        {state.unresolved.length > 0 && (
          <p role="status">
            {state.unresolved.length}{' '}
            {state.unresolved.length === 1 ? 'value still needed' : 'values still needed'}
          </p>
        )}
        <FillValuesActions
          model={model}
          state={state}
          returnLabel={returnLabel}
          confirm={confirm}
        />
      </DialogContent>
    </Dialog>
  );
}
