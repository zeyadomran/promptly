import type { SearchRequest } from '../../shared/contracts/domain';
import { previewLimits } from '../../shared/contracts/preview-limits';
import { isScalarBoundary } from '../../shared/search/match-text';

/** Tray normalization consumes full authoritative text but retains only its short label prefix. */
function trayPrefix(text: string): string {
  let prefix = '';
  let characters = 0;
  let whitespace = false;

  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;

    if (code < 32 || code === 127 || /\s/u.test(character)) {
      whitespace = prefix.length > 0;
      continue;
    }

    if (whitespace) {
      prefix += ' ';
      characters += 1;
      whitespace = false;
    }

    prefix += character;
    characters += 1;
    // Include the non-space character after a separator to preserve ellipsis detection.
    if (characters > previewLimits.trayCharacters) break;
  }

  return prefix;
}

export function rowPreview(text: string, kind: SearchRequest['preview']): string {
  if (kind === 'tray') return trayPrefix(text);
  let end = Math.min(text.length, previewLimits.textUnits);

  if (!isScalarBoundary(text, end)) end -= 1;
  return text.slice(0, end);
}
