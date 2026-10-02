import { MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useLibraryCommands } from '../library/library-commands';
import { useLibrary } from '../library/library-context';

export function SnippetMoreMenu({ snippet, eligible }: { snippet: Snippet; eligible: boolean }) {
  const commands = useLibraryCommands();
  const { model } = useLibrary();
  const [source, setSource] = useState({
    available: false,
    explanation: 'Checking source availability…'
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    void window.promptly
      .getSnippetSource({ id: snippet.id })
      .then((result) => {
        if (active)
          setSource(
            result.ok ? result.value : { available: false, explanation: result.error.message }
          );
      })
      .catch(() => {
        if (active)
          setSource({ available: false, explanation: 'Unable to verify the source application.' });
      });
    return () => {
      active = false;
    };
  }, [snippet.id]);
  const duplicate = async () => {
    if (!eligible || pending) return;
    setPending(true);
    try {
      const result = await window.promptly.duplicateSnippet({ id: snippet.id });

      if (!result.ok) commands?.report(result.error.message);
      else model.refresh();
    } catch {
      commands?.report('Unable to duplicate the snippet.');
    } finally {
      setPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="More snippet actions"
          disabled={!eligible || pending}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!eligible}
          onSelect={() => {
            void commands?.copy(snippet.id, 'markdown');
          }}
        >
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!eligible || pending}
          onSelect={() => {
            void duplicate();
          }}
        >
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!eligible || !source.available}
          onSelect={() => {
            void window.promptly
              .openSnippetSource({ id: snippet.id })
              .then((result) => {
                if (!result.ok) commands?.report(result.error.message);
              })
              .catch(() => {
                commands?.report('Unable to open the source application.');
              });
          }}
        >
          Open source application
        </DropdownMenuItem>
        {!source.available && <p className="snippet-source-explanation">{source.explanation}</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!eligible}
          onSelect={() => {
            void commands?.deleteSelected();
          }}
        >
          Delete snippet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
