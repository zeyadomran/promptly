import type { UpdateState } from '../../../../shared/contracts/updates';

interface Snapshot {
  state?: UpdateState;
  error?: string;
}
let snapshot: Snapshot = {};
let generation = 0;
let stop: (() => void) | undefined;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function accept(state: UpdateState) {
  if (state.revision < (snapshot.state?.revision ?? -1)) return;
  publish({ state });
}

export function subscribeUpdates(listener: () => void) {
  listeners.add(listener);
  if (stop === undefined) {
    const currentGeneration = ++generation;

    stop = window.promptly.subscribeUpdates((state) => {
      if (generation === currentGeneration) accept(state);
    });
    void window.promptly
      .getUpdateState({})
      .then((result) => {
        if (generation !== currentGeneration) return;
        if (result.ok) accept(result.value);
        else publish({ ...snapshot, error: result.error.message });
      })
      .catch(() => {
        if (generation === currentGeneration)
          publish({ ...snapshot, error: 'Unable to read update status.' });
      });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      generation++;
      stop?.();
      stop = undefined;
    }
  };
}

export const getUpdateSnapshot = () => snapshot;

export async function actOnUpdate() {
  const state = snapshot.state;

  if (state === undefined || ['checking', 'updating', 'unavailable'].includes(state.status)) return;
  publish({ state });
  try {
    if (
      state.status === 'ready' ||
      (state.status === 'error' && state.retryOperation === 'restart')
    ) {
      const restarted = await window.promptly.restartForUpdate({});

      if (!restarted.ok) publish({ ...snapshot, error: restarted.error.message });
      return;
    }

    const result = await (state.status === 'available' ||
    (state.status === 'error' && state.retryOperation === 'install')
      ? window.promptly.installUpdate({})
      : window.promptly.checkForUpdates({}));

    if (result.ok) accept(result.value);
    else publish({ ...snapshot, error: result.error.message });
  } catch {
    publish({ ...snapshot, error: 'Unable to complete the update action. Try again.' });
  }
}
