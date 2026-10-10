import type { ReturnOutcome } from '../../shared/contracts/previous-app';
import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';

export interface SaveReturnOutcome<T> {
  status: 'saved';
  saved: T;
  returned: ReturnOutcome['returned'];
  returnLabel?: string;
  warnings: 'RETURN_UNCONFIRMED'[];
}

/** save owns its durable serializer; this wrapper never writes the clipboard or nests it. */
export async function executeSaveAndReturn<T>(
  save: () => Promise<DesktopResult<T>>,
  returnToPreviousApp: () => Promise<ReturnOutcome>,
  isAlive: () => boolean
): Promise<DesktopResult<SaveReturnOutcome<T>>> {
  if (!isAlive()) return failure('UNAUTHORIZED', 'The originating window is unavailable.');
  let saved: DesktopResult<T>;

  try {
    saved = await save();
  } catch {
    return failure('UNAVAILABLE', 'The save was not confirmed.');
  }

  if (!saved.ok) return saved;
  const outcome: SaveReturnOutcome<T> = {
    status: 'saved',
    saved: saved.value,
    returned: 'unavailable',
    warnings: []
  };

  try {
    if (isAlive()) {
      const result = await returnToPreviousApp();

      outcome.returned = result.returned;
      if (result.label !== undefined) outcome.returnLabel = result.label;
    }

    if (outcome.returned !== 'returned') outcome.warnings.push('RETURN_UNCONFIRMED');
  } catch {
    outcome.warnings.push('RETURN_UNCONFIRMED');
  }

  return { ok: true, value: outcome };
}
