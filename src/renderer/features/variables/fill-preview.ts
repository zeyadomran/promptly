import { workflowLimits } from '../../../shared/contracts/workflow-copy';
import { formatCopyText } from '../../../shared/workflows/copy-text';
import { resolveTemplate } from '../../../shared/workflows/template';
import type { FillState } from './fill-state';

export function previewFields(state: FillState): Partial<FillState> {
  const prepared = state.prepared;

  if (prepared === null) return {};
  try {
    const resolved =
      prepared.variables.length === 0
        ? { text: prepared.text, unresolved: [] }
        : resolveTemplate(prepared.text, state.values);
    const preview = formatCopyText(resolved.text, state.format);

    if (preview.length > workflowLimits.text)
      throw new Error('This resolved text is too long to copy.');
    return { preview, previewValid: true, unresolved: resolved.unresolved };
  } catch {
    return { preview: '', previewValid: false, error: 'This resolved text is too long to copy.' };
  }
}
