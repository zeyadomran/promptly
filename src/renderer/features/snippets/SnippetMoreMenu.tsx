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
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { useLibraryCommands } from '../library/library-commands';
import { useLibrary } from '../library/library-context';
import { useShellNavigation } from '../window-chrome/shell-navigation';

export function SnippetMoreMenu({ snippet, eligible }: { snippet: Snippet; eligible: boolean }) {
  const { view } = useShellNavigation();
  const [open, setOpen] = useState(false);
  const commands = useLibraryCommands();
  const { model } = useLibrary();
  const [source, setSource] = useState({
    snippet,
    available: false,
    explanation: 'Checking source availability…'
  });
  // A new committed snapshot retires availability before the refresh effect runs.
  const sourceReady = source.snippet === snippet;
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    void window.promptly
      .getSnippetSource({ id: snippet.id })
      .then((result) => {
        if (active)
          setSource({
            snippet,
            ...(result.ok ? result.value : { available: false, explanation: result.error.message })
          });
      })
      .catch(() => {
        if (active)
          setSource({
            snippet,
            available: false,
            explanation: 'Unable to verify the source application.'
          });
      });
    return () => {
      active = false;
    };
  }, [snippet]);
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
    <DropdownMenu open={view === 'library' && open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>More snippet actions</TooltipContent>
      </Tooltip>
      {view === 'library' && (
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (document.querySelector('[data-shell-library][hidden]') !== null)
              event.preventDefault();
          }}
        >
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
            disabled={!eligible || !sourceReady || !source.available}
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
          {(!sourceReady || !source.available) && (
            <p className="snippet-source-explanation">
              {sourceReady ? source.explanation : 'Checking source availability…'}
            </p>
          )}
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
      )}
    </DropdownMenu>
  );
}
