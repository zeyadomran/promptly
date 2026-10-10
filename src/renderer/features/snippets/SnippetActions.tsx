import { Check, Copy, Pencil } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { useLibraryCommands } from '../library/library-commands';
import { useLibrary } from '../library/library-context';
import { useSnippetSession } from './snippet-context';
import { SnippetMoreMenu } from './SnippetMoreMenu';

export function SnippetActions({ snippet }: { snippet: Snippet }) {
  const commands = useLibraryCommands();
  const { state: library } = useLibrary();
  const { session, state } = useSnippetSession();
  const eligible = library.selectedId === snippet.id && !state.loading;
  const copied = commands?.copiedId === snippet.id;

  return (
    <div
      className="snippet-actions"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <Button
        className="snippet-copy"
        disabled={!eligible || commands === undefined}
        onClick={() => {
          void commands?.copy(snippet.id);
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <Button
        variant="outline"
        disabled={!eligible}
        onClick={() => {
          void session.edit();
        }}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Button>
      <SnippetMoreMenu snippet={snippet} eligible={eligible} />
    </div>
  );
}
