import type { ContextSeparator } from '../contracts/workflow-copy';
import { workflowLimits } from '../contracts/workflow-copy';

export function formatContext(texts: readonly string[], separator: ContextSeparator): string {
  const blocks: string[] = [];
  let length = 0;
  const join = separator === 'divider' ? '\n\n---\n\n' : '\n\n';

  for (const [index, text] of texts.entries()) {
    let end = text.length;

    while (end > 0 && (text.charCodeAt(end - 1) === 10 || text.charCodeAt(end - 1) === 13))
      end -= 1;
    const trimmed = text.slice(0, end);
    const block =
      separator === 'tagged'
        ? `<snippet index="${String(index + 1)}">\n${trimmed}\n</snippet>`
        : trimmed;

    length += block.length + (index === 0 ? 0 : join.length);
    if (length > workflowLimits.text)
      throw new Error('This bundle is too long to copy. Remove a snippet.');
    blocks.push(block);
  }

  return blocks.join(join);
}
