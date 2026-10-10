import { formatCopyText } from '../../shared/workflows/copy-text';

/** Clipboard text passes through UTF-8; reject unpaired UTF-16 before changing it. */
export function clipboardText(text: string, platform: string, format: 'text' | 'markdown') {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);

    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++index);

      if (!(next >= 0xdc00 && next <= 0xdfff)) return undefined;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return undefined;
  }

  // Windows CF_UNICODETEXT terminates at NUL.
  if (platform === 'win32' && text.includes('\0')) return undefined;
  return formatCopyText(text, format);
}
