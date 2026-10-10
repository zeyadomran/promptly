import { Field, FieldDescription, FieldLabel } from '../../components/ui/field';

export function ResolvedPreview({ text }: { text: string }) {
  return (
    <Field>
      <FieldLabel>Exact text</FieldLabel>
      <pre className="workflow-exact-preview" tabIndex={0} aria-label="Exact clipboard text">
        {text}
      </pre>
      <FieldDescription>{text.length.toLocaleString()} characters</FieldDescription>
    </Field>
  );
}
