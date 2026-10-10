import { Check, Copy, CornerUpLeft, Pencil } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { useLibraryCommands } from '../library/library-commands';
import { useLibrary } from '../library/library-context';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';
import { useSnippetSession } from './snippet-context';
import { SnippetMoreMenu } from './SnippetMoreMenu';

export function SnippetActions({ snippet }: { snippet: Snippet }) {
  const commands = useLibraryCommands();
  const { state: library } = useLibrary();
  const { session, state } = useSnippetSession();
  const eligible = library.selectedId === snippet.id && !state.loading;
  const copied = commands?.copiedId === snippet.id;
  const workflow = useWorkflowCopy();
  const copyDisabled =
    !eligible ||
    commands === undefined ||
    snippet.text.trim() === '' ||
    workflow.bundleState.active ||
    workflow.busy;

  return (
    <div
      className="snippet-actions"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <Button
        className="snippet-copy"
        disabled={copyDisabled}
        title={
          snippet.text.trim() === ''
            ? 'Add text to copy. Attachments are shared separately.'
            : undefined
        }
        onClick={() => {
          void commands?.copy(snippet.id);
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Copy and return"
        disabled={copyDisabled || workflow.returnLabel === undefined}
        title={
          workflow.returnLabel === undefined
            ? 'No previous app to return to.'
            : `Copy, then switch back to ${workflow.returnLabel}. Paste it yourself.`
        }
        onClick={() => {
          void commands?.copy(snippet.id, 'text', { return: true });
        }}
      >
        <CornerUpLeft aria-hidden="true" />
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
