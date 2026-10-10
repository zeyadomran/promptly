import { workflowLimits } from '../contracts/workflow-copy';
import { templateTokens } from './template';

/** A bounded display summary; the sentinel 33 is rendered as 32+. */
export function countTemplateNames(text: string): number {
  const names = new Set<string>();

  for (const token of templateTokens(text)) {
    names.add(token.name);
    if (names.size > workflowLimits.variables) return workflowLimits.variables + 1;
  }

  return names.size;
}
