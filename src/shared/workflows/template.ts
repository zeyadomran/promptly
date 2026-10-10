import type { VariableAnswers } from '../contracts/workflow-copy';
import { workflowLimits } from '../contracts/workflow-copy';

export interface TemplateToken {
  name: string;
  start: number;
  end: number;
  raw: string;
}

/** Matches saved spans once; inserted values never become template input. */
export function* templateTokens(text: string): Generator<TemplateToken> {
  const pattern = /\{\{[ \t]*([\p{L}][\p{L}\p{Nd}_-]*)[ \t]*\}\}/gu;

  for (const match of text.matchAll(pattern)) {
    const name = match[1];

    if (name !== undefined && name.length <= 128 && Array.from(name).length <= 64)
      yield { name, start: match.index, end: match.index + match[0].length, raw: match[0] };
  }
}

export function parseTemplate(text: string) {
  const names = new Map<string, number>();

  for (const token of templateTokens(text)) {
    names.set(token.name, (names.get(token.name) ?? 0) + 1);
    if (names.size > workflowLimits.variables)
      throw new Error('A copy can use at most 32 variable names.');
  }

  return [...names].map(([name, count]) => ({ name, count }));
}

export function hasVariables(text: string): boolean {
  return templateTokens(text).next().done !== true;
}

export function literalBraceSequences(text: string): number {
  const tokens = templateTokens(text);
  let current = tokens.next();
  let count = 0;

  for (const opening of text.matchAll(/\{\{/gu)) {
    while (current.done !== true && current.value.end <= opening.index) current = tokens.next();
    if (current.done === true || current.value.start > opening.index + 1) count += 1;
  }

  return count;
}

export function resolveTemplate(text: string, values: VariableAnswers) {
  const chunks: string[] = [];
  const unresolved = new Set<string>();
  let offset = 0;
  let length = 0;
  const append = (chunk: string) => {
    length += chunk.length;
    if (length > workflowLimits.text) throw new Error('This text is too long to copy.');
    chunks.push(chunk);
  };

  for (const token of templateTokens(text)) {
    append(text.slice(offset, token.start));
    const answer = Object.hasOwn(values, token.name) ? values[token.name] : undefined;

    if (answer === undefined || (!answer.leaveBlank && answer.value.length === 0)) {
      unresolved.add(token.name);
      append(token.raw);
    } else append(answer.leaveBlank ? '' : answer.value);
    offset = token.end;
  }

  append(text.slice(offset));
  return { text: chunks.join(''), unresolved: [...unresolved] };
}
