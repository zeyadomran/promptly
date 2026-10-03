import type { ShortcutCollision, ShortcutEdit } from '../../../shared/shortcuts/shortcut-edit';

export interface RecordingSnapshot {
  phase: 'idle' | 'starting' | 'recording' | 'conflict' | 'saving';
  target: string | undefined;
  error: string | undefined;
  candidate: string | undefined;
  collision?: ShortcutCollision | undefined;
  preview?: string | undefined;
}

export function recordingCandidate(
  snapshot: RecordingSnapshot,
  accelerator: string,
  inspection: ShortcutEdit | undefined
): RecordingSnapshot {
  return {
    ...snapshot,
    candidate: accelerator,
    preview: undefined,
    error: undefined,
    collision: inspection?.kind === 'conflict' ? inspection.collision : undefined
  };
}

export function recordingError(snapshot: RecordingSnapshot, error: unknown): RecordingSnapshot {
  return {
    ...snapshot,
    phase: 'idle',
    candidate: undefined,
    collision: undefined,
    preview: undefined,
    error: error instanceof Error ? error.message : 'Unable to record this shortcut. Try again.'
  };
}
