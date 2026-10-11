import { literalBraceSequences, parseTemplate } from '../../../shared/workflows/template';
import { usePreferences } from '../settings/settings-context';

export function VariableStatus({ text, compact = false }: { text: string; compact?: boolean }) {
  const { settings } = usePreferences();

  if (!settings.promptVariables) return null;
  let count: number;
  let names = '';

  try {
    const variables = parseTemplate(text);

    count = variables.length;
    names =
      variables
        .slice(0, 3)
        .map(({ name }) => name)
        .join(', ') + (count > 3 ? ` and ${String(count - 3)} more` : '');
  } catch {
    count = 33;
  }

  const literal = literalBraceSequences(text);

  if (count === 0 && literal === 0) return null;
  const description = [
    count > 32
      ? '32+ variables. Copy as written or reduce to 32 names.'
      : count > 0
        ? `Variables: ${names}. You'll fill these when copying.`
        : '',
    literal > 0 ? 'Unrecognized braces are kept as written.' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <p className="variable-status" title={compact ? description : undefined}>
      {compact
        ? count > 32
          ? '32+ variables'
          : literal > 0
            ? 'Check braces'
            : `${String(count)} ${count === 1 ? 'variable' : 'variables'}`
        : description}
    </p>
  );
}
