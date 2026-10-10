import type {
  WorkflowCopyOperations,
  WorkflowCopySource
} from '../../../shared/contracts/workflow-copy';
import { copySourceState } from './fill-source';
import { emptyFillState, type FillState } from './fill-state';

export interface FillCommitOwner {
  state(): FillState;
  source(): WorkflowCopySource | undefined;
  generation(): number;
  publish(update: Partial<FillState>): void;
  prepare(source: WorkflowCopySource): Promise<void>;
  cancel(error: string): void;
}

export async function commitFill(
  bridge: WorkflowCopyOperations,
  owner: FillCommitOwner,
  returnToApp: boolean,
  asWritten: boolean
): Promise<boolean> {
  const state = owner.state();
  const prepared = state.prepared;

  if (prepared === null || state.pending || state.loading) return false;
  const source = owner.source();
  const sourceState = copySourceState(prepared.source, source);

  if (source === undefined || sourceState === 'missing') {
    owner.cancel('Your draft is no longer available.');
    return false;
  }

  if (sourceState === 'changed') {
    owner.publish({ error: 'Your draft changed. Check the values again.' });
    await owner.prepare(source);
    return false;
  }

  if (!asWritten && prepared.mode === 'as-written') {
    owner.publish({ error: 'Choose Copy as written to copy this literal preview.' });
    return false;
  }

  if (!asWritten && state.unresolved.length > 0) {
    owner.publish({
      focusName: state.unresolved[0],
      error: 'Fill every value or choose Leave blank.'
    });
    return false;
  }

  if (!asWritten && !state.previewValid) return false;
  const generation = owner.generation();

  owner.publish({ pending: true, error: undefined });
  try {
    const result = await bridge.commitCopy({
      token: prepared.token,
      values: asWritten ? {} : state.values,
      format: state.format,
      mode: asWritten ? 'as-written' : 'resolved',
      return: returnToApp,
      ...(source.kind === 'draft' ? { draftRevision: source.draftRevision } : {})
    });

    if (generation !== owner.generation()) return false;
    if (!result.ok) {
      owner.publish({ pending: false, error: result.error.message, errorCode: result.error.code });
      if (result.error.code === 'CONFLICT' || result.error.code === 'PREPARATION_EXPIRED') {
        const current = owner.source();

        if (current === undefined) owner.cancel('Your draft is no longer available.');
        else await owner.prepare(current);
      } else if (result.error.code === 'NOT_FOUND') {
        if (source.kind === 'bundle') owner.publish({ prepared: null });
        else owner.cancel(result.error.message);
      }

      return false;
    }

    owner.publish({ ...emptyFillState(), outcome: result.value });
    return true;
  } catch {
    if (generation === owner.generation())
      owner.publish({ pending: false, error: 'Unable to copy. Your values are kept.' });
    return false;
  }
}
