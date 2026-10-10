import '../variables/workflows.css';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import type { FillModel } from '../variables/fill-model';
import { VariableFields } from '../variables/VariableFields';
import type { BundleModel } from './bundle-model';
import { BundleOrderList } from './BundleOrderList';
import { BundlePreview } from './BundlePreview';
import { BundleReviewActions } from './BundleReviewActions';
import { BundleSeparator } from './BundleSeparator';

export function BundleReviewDialog({
  model,
  fill,
  compact = false,
  returnLabel
}: {
  model: BundleModel;
  fill: FillModel;
  compact?: boolean;
  returnLabel?: string;
}) {
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const filling = useSyncExternalStore(fill.subscribe, fill.snapshot);
  const content = useRef<HTMLDivElement>(null);
  const sourceKey = `${state.entries.map((entry) => entry.id).join(',')}:${state.separator}`;

  useEffect(() => {
    if (!state.reviewing) return;
    if (model.source().ids.length < 2) {
      fill.cancel();
      return;
    }

    if (fill.snapshot().active) void fill.refresh(model.source());
    else void fill.open(model.source());
  }, [model, fill, state.reviewing, sourceKey]);
  useEffect(() => {
    if (filling.prepared !== null) model.reconcile(filling.prepared);
  }, [model, filling.prepared]);
  useEffect(() => {
    if (filling.errorCode === 'NOT_FOUND' && filling.prepared === null && state.reviewing)
      void model.refreshEntries().then(() => {
        if (model.canCopy && model.snapshot().reviewing) void fill.refresh(model.source());
      });
  }, [model, fill, filling.errorCode, filling.prepared, state.reviewing]);
  const back = () => {
    if (!filling.pending) {
      fill.cancel();
      model.back();
    }
  };

  const confirm = (returnToApp: boolean) => {
    if (!model.canCopy || (returnToApp && returnLabel === undefined)) return;
    void fill.copy(returnToApp).then((copied) => {
      if (copied) {
        model.cancel();
        return;
      }

      const name = fill.snapshot().unresolved[0];

      [...(content.current?.querySelectorAll<HTMLTextAreaElement>('[data-variable-name]') ?? [])]
        .find((field) => field.dataset['variableName'] === name)
        ?.focus();
    });
  };

  return (
    <Dialog
      open={state.reviewing}
      onOpenChange={(open) => {
        if (!open) back();
      }}
    >
      <DialogContent
        ref={content}
        className="workflow-dialog bundle-review-dialog"
        data-compact={compact}
        showCloseButton={!filling.pending}
        onEscapeKeyDown={(event) => {
          if (filling.pending) event.preventDefault();
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
          <DialogTitle>Review bundle</DialogTitle>
          <DialogDescription>
            Combine full snippet text in this order. Nothing is saved.
          </DialogDescription>
        </DialogHeader>
        <div className="bundle-review-columns">
          <div className="bundle-review-controls">
            <BundleOrderList
              entries={state.entries}
              pending={filling.pending || filling.loading || state.pending}
              move={(id, delta) => {
                model.move(id, delta);
              }}
              remove={(id) => {
                model.remove(id);
              }}
            />
            <BundleSeparator
              value={state.separator}
              pending={filling.pending || filling.loading || state.pending}
              change={(separator) => {
                model.setSeparator(separator);
              }}
            />
            <VariableFields
              variables={filling.prepared?.variables ?? []}
              values={filling.values}
              pending={filling.pending || filling.loading}
              bundle
              change={(name, value) => {
                fill.change(name, value);
              }}
              leaveBlank={(name, enabled) => {
                fill.leaveBlank(name, enabled);
              }}
              confirm={confirm}
            />
          </div>
          <div className="bundle-review-output">
            {filling.loading && <p role="status">Preparing full text…</p>}
            {state.entries.length < 2 && (
              <p role="status">Select at least two snippets to copy a bundle.</p>
            )}
            {filling.prepared !== null && (
              <BundlePreview
                prepared={filling.prepared}
                values={filling.values}
                exactText={filling.preview}
              />
            )}
            {filling.prepared !== null && filling.prepared.attachmentCount > 0 && (
              <p className="workflow-note">Attachments are not included. A bundle is text only.</p>
            )}
            {filling.unresolved.length > 0 && (
              <p role="status">{filling.unresolved.length} values still needed</p>
            )}
            {filling.error !== undefined && (
              <p role="alert" className="workflow-error">
                {filling.error}
              </p>
            )}
          </div>
        </div>
        <BundleReviewActions
          filling={filling}
          selectionPending={state.pending}
          canCopy={model.canCopy}
          returnLabel={returnLabel}
          back={back}
          confirm={confirm}
        />
      </DialogContent>
    </Dialog>
  );
}
