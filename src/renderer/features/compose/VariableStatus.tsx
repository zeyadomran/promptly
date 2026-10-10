import { literalBraceSequences, parseTemplate } from '../../../shared/workflows/template';
import { usePreferences } from '../settings/settings-context';

export function VariableStatus({ text }: { text: string }) {
  const { settings } = usePreferences();

  if (!settings.promptVariables) return null;
  let count: number;

  try {
    count = parseTemplate(text).length;
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
          ? `${String(count)} ${count === 1 ? 'variable' : 'variables'} · You’ll fill these when copying.`
          : ''}
      {literal > 0 ? `${count > 0 ? ' ' : ''}Unrecognized braces are kept as written.` : ''}
    </p>
  );
}
