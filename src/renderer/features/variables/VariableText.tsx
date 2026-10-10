import type { ReactNode } from 'react';

import type { VariableAnswers } from '../../../shared/contracts/workflow-copy';
import { resolveTemplate, templateTokens } from '../../../shared/workflows/template';

/** The complete text stays visible; bounded decoration prevents pathological DOM allocation. */
export function VariableText({
  text,
  values
}: {
  text: string;
  values?: VariableAnswers | undefined;
}) {
  if (values !== undefined) {
    try {
      resolveTemplate(text, values);
    } catch {
      return <span>{text}</span>;
    }
  }

  const nodes: ReactNode[] = [];
  let offset = 0;
  let decorated = 0;

  for (const token of templateTokens(text)) {
    if (decorated >= 2_048) break;
    nodes.push(text.slice(offset, token.start));
    const answer =
      values !== undefined && Object.hasOwn(values, token.name) ? values[token.name] : undefined;
    const resolved = answer !== undefined && (answer.leaveBlank || answer.value.length > 0);

    nodes.push(
      <span
        key={token.start}
        className="variable-token"
        data-state={resolved ? 'filled' : 'unresolved'}
        aria-label={answer?.leaveBlank === true ? `${token.name}: blank` : undefined}
      >
        {answer?.leaveBlank === true ? (
          <span className="variable-blank">blank</span>
        ) : resolved ? (
          answer.value
        ) : (
          token.raw
        )}
      </span>
    );
    offset = token.end;
    decorated += 1;
  }

  const tail = text.slice(offset);

  nodes.push(values === undefined ? tail : resolveTemplate(tail, values).text);
  return <span>{nodes}</span>;
}
