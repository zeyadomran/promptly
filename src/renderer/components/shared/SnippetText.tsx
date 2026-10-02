interface SnippetTextProps {
  text: string;
  className?: string;
}

/** Snippets are untrusted plain text, including markup and script-shaped content. */
export function SnippetText({ text, className }: SnippetTextProps) {
  return <pre className={className}>{text}</pre>;
}
