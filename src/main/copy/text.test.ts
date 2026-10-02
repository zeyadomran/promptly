import { describe, expect, it } from 'vitest';

import { clipboardText } from './text';

describe('lossless clipboard representation', () => {
  it('keeps Unicode, CRLF, whitespace and macOS NUL exactly', () => {
    const text = '  你好😀e\u0301\r\n\0tail  ';

    expect(clipboardText(text, 'darwin', 'text')).toBe(text);
    expect(clipboardText(text, 'win32', 'text')).toBeUndefined();
  });

  it.each(['\ud800', '\udfff', 'x\ud800y', 'x\udfffy'])(
    'rejects malformed UTF-16 %j before formatting',
    (text) => {
      expect(clipboardText(text, 'darwin', 'markdown')).toBeUndefined();
    }
  );

  it('encloses literal fences and language-looking text without altering its contents', () => {
    const text = '```javascript\nalert(1)\n```\n`````\n你好😀';
    const result = clipboardText(text, 'darwin', 'markdown');

    expect(result).toBe(`\`\`\`\`\`\`\n${text}\n\`\`\`\`\`\``);
  });

  it('handles many disjoint backtick runs without an argument-count overflow', () => {
    const text = '`x'.repeat(300_000);

    expect(clipboardText(text, 'darwin', 'markdown')).toBe(`\`\`\`\n${text}\n\`\`\``);
    expect(clipboardText('line\n', 'darwin', 'markdown')).toBe('```\nline\n```');
  });
});
