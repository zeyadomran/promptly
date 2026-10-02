// Only the first line: ambiguous ASCII expressions are preserved. This is not a shell parser.
const prompt =
  /^(?:❯[ \t]+|[$>%][ \t]+(?=(?:echo|git|npm|npx|node|python|python3|pip|cd|ls|pwd)(?:[ \t]|$)))/;

export function normalizeSnippet(text: string, enabled: boolean): string {
  return enabled ? text.trim().replace(prompt, '') : text;
}
