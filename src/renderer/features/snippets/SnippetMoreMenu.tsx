import { CopyPlus, FileCode, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { Snippet } from '../../../shared/contracts/domain';
import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
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
import { usePreferences } from '../settings/settings-context';
import { useShellNavigation } from '../window-chrome/shell-navigation';

export function SnippetMoreMenu({ snippet, eligible }: { snippet: Snippet; eligible: boolean }) {
  const { view } = useShellNavigation();
  const [open, setOpen] = useState(false);
  const commands = useLibraryCommands();
  const { model } = useLibrary();
  const { settings } = usePreferences();
  const deleteShortcut = shortcutLabel(settings.localShortcuts.delete, window.promptly.platform)
    .replace('DELETE', 'Del')
    .replace('BACKSPACE', 'Backspace')
    .replace('TAB', 'Tab');
  const [pending, setPending] = useState(false);

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
            <FileCode aria-hidden="true" />
            Copy as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!eligible || pending}
            onSelect={() => {
              void duplicate();
            }}
          >
            <CopyPlus aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!eligible}
            onSelect={() => {
              void commands?.deleteSelected();
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete snippet
            <span className="menu-shortcut">{deleteShortcut}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
