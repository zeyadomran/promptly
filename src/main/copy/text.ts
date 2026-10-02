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
  if (format === 'text') return text;
  let longest = 2;

  for (const run of text.matchAll(/`+/g)) longest = Math.max(longest, run[0].length);
  const fence = '`'.repeat(longest + 1);

  return `${fence}\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}`;
}
