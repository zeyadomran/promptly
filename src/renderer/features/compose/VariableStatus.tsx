import { literalBraceSequences, parseTemplate } from '../../../shared/workflows/template';
import { usePreferences } from '../settings/settings-context';

export function VariableStatus({ text }: { text: string }) {
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
  return (
    <p className="variable-status">
      {count > 32
        ? '32+ variables. Copy as written or reduce to 32 names.'
        : count > 0
          ? `Variables: ${names}. You’ll fill these when copying.`
          : ''}
      {literal > 0 ? `${count > 0 ? ' ' : ''}Unrecognized braces are kept as written.` : ''}
    </p>
  );
}
