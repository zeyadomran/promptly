import type { SearchPage, SearchValidationTimings } from '../contracts/domain';
import type { DesktopResult } from '../contracts/result';

/** Called only after the normal boundary schema accepted a search response. */
export function recordSearchValidation(
  result: DesktopResult<unknown>,
  boundary: keyof SearchValidationTimings,
  started: number
): void {
  if (
    !result.ok ||
    typeof result.value !== 'object' ||
    result.value === null ||
    !('searchDurationMs' in result.value)
  )
    return;
  const page = result.value as SearchPage;

  (page.validationTimings ??= {})[boundary] = performance.now() - started;
}
