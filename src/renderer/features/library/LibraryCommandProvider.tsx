import type { ReactNode } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { Toaster } from '../../components/ui/sonner';
import { keyboardFocus } from './keyboard-focus';
import { LibraryCommandService } from './library-command-service';
import { LibraryCommandsContext, useLibraryTagActions } from './library-commands';
import { useLibrary } from './library-context';
import { libraryKeyCommand } from './library-keyboard';

export function LibraryCommandProvider({ children }: { children: ReactNode }) {
  const { model, selection } = useLibrary();
  const tags = useLibraryTagActions();
  const [commands] = useState(() => new LibraryCommandService(window.promptly, {
    selectedId: () => model.snapshot().selectedId,
    refresh: () => model.refresh(),
    deleted: (undo) => {
      toast('Snippet deleted', { action: { label: 'Undo', onClick: () => { void undo(); } } });
    }
  }));
  const state = useSyncExternalStore(commands.subscribe, commands.snapshot);

  useEffect(() => {
    commands.start();
    return () => { commands.close(); };
  }, [commands]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const command = libraryKeyCommand({
        key: event.key, meta: event.metaKey, ctrl: event.ctrlKey, alt: event.altKey,
        shift: event.shiftKey, composing: event.isComposing || event.keyCode === 229,
        prevented: event.defaultPrevented, focus: keyboardFocus(event),
        selected: model.snapshot().selectedId !== null, hasSearch: selection.hasSearch
      });

      if (command === undefined) return;
      event.preventDefault();
      const selectedId = model.snapshot().selectedId;
      const run = async () => {
        if (command === 'copy' && selectedId !== null) await commands.copy(selectedId);
        if (command === 'next' || command === 'previous') await selection.moveSelection(command === 'next' ? 1 : -1);
        if (command === 'delete') await commands.deleteSelected();
        if (command === 'focus-search') selection.focusSearch();
        if (command === 'clear-search') { selection.clearSearch(); selection.focusSearch(); }
        if (command === 'tag' && selectedId !== null) {
          if (tags === undefined) commands.report('Tag editing is not available yet.');
          else tags.editSelectedTags(selectedId);
        }
        if (command === 'settings' || command === 'hide') {
          const result = command === 'settings'
            ? await window.promptly.openDesktopWindow({ kind: 'settings' })
            : await window.promptly.setWindowVisibility({ visible: false });

          if (!result.ok) commands.report(result.error.message);
        }
      };

      void run().catch(() => { commands.report('Unable to complete the library command.'); });
    };

    window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('keydown', keyboard); };
  }, [commands, model, selection, tags]);

  return (
    <LibraryCommandsContext value={{ ...state, copy: (id, format) => commands.copy(id, format) }}>
      {children}
      <Toaster />
    </LibraryCommandsContext>
  );
}
