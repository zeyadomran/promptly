/** Shared literal packaging for renderer exact preview and main clipboard execution. */
export function formatCopyText(text: string, format: 'text' | 'markdown'): string {
  if (format === 'text') return text;
  let longest = 2;

  for (const run of text.matchAll(/`+/gu)) longest = Math.max(longest, run[0].length);
  const fence = '`'.repeat(longest + 1);

  return `${fence}\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}`;
}
