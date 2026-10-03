import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { usePreferences } from '../settings/settings-context';
import { keyboardFocus, windowFocusMaySearch } from './keyboard-focus';
import { LibraryCommandService } from './library-command-service';
import { LibraryCommandsContext, useLibraryTagActions } from './library-commands';
import { useLibrary } from './library-context';
import { libraryKeyCommand } from './library-keyboard';
import { LibraryCopyToast, notifyCopied } from './LibraryCopyToast';
import { LibraryUndoToast } from './LibraryUndoToast';

export function LibraryCommandProvider({
  children,
  active
}: {
  children: ReactNode;
  active: boolean;
}) {
  const { model, selection } = useLibrary();
  const tags = useLibraryTagActions();
  const { settings } = usePreferences();
  const composing = useRef(false);
  const [undo, setUndo] = useState<{ run: () => Promise<void> }>();
  const [commands] = useState(
    () =>
      new LibraryCommandService(window.promptly, {
        selectedId: () => model.snapshot().selectedId,
        copied: (id) => {
          const cache = model.snapshot().cache;
          const index = cache.indexOf(id);

          notifyCopied(index === undefined ? undefined : cache.at(index)?.snippet.text);
        },
        refresh: () => {
          model.refresh();
        },
        deleted: (restore) => {
          setUndo({ run: restore });
        }
      })
  );
  const state = useSyncExternalStore(commands.subscribe, commands.snapshot);

  useEffect(() => {
    if (undo === undefined) return;
    const timer = setTimeout(() => {
      setUndo(undefined);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [undo]);
  useEffect(() => {
    commands.start();
    return () => {
      commands.close();
    };
  }, [commands]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const command = libraryKeyCommand(
        {
          key: event.key,
          code: event.code,
          altGraph: event.getModifierState('AltGraph'),
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          composing: composing.current || event.isComposing || event.key === 'Process',
          prevented: event.defaultPrevented,
          repeat: event.repeat,
          active,
          focus: keyboardFocus(event),
          selected: model.snapshot().selectedId !== null,
          hasSearch: selection.hasSearch
        },
        settings.localShortcuts
      );

      if (command === undefined) return;
      event.preventDefault();
      const selectedId = model.snapshot().selectedId;
      const run = async () => {
        if (command === 'copy' && selectedId !== null) await commands.copy(selectedId);
        if (command === 'next' || command === 'previous')
          await selection.moveSelection(command === 'next' ? 1 : -1);
        if (command === 'delete') await commands.deleteSelected();
        if (command === 'focus-search') selection.focusSearch();
        if (command === 'clear-search') {
          selection.clearSearch();
          selection.focusSearch();
        }

        if (command === 'tag' && selectedId !== null) {
          if (tags === undefined) commands.report('Tag editing is not available yet.');
          else tags.editSelectedTags(selectedId);
        }

        if (command === 'settings' || command === 'hide') {
          const result =
            command === 'settings'
              ? await window.promptly.openDesktopWindow({ kind: 'settings' })
              : await window.promptly.setWindowVisibility({ visible: false });

          if (!result.ok) commands.report(result.error.message);
        }
      };

      void run().catch(() => {
        commands.report('Unable to complete the library command.');
      });
    };

    const started = () => {
      composing.current = true;
    };

    const finished = () => {
      composing.current = false;
    };

    const unsubscribeFocus = window.promptly.subscribeWindowFocus(() => {
      if (active && !composing.current && windowFocusMaySearch()) selection.focusSearch();
    });

    window.addEventListener('compositionstart', started);
    window.addEventListener('compositionend', finished);
    window.addEventListener('keydown', keyboard);
    return () => {
      unsubscribeFocus();
      window.removeEventListener('compositionstart', started);
      window.removeEventListener('compositionend', finished);
      window.removeEventListener('keydown', keyboard);
    };
  }, [active, commands, model, selection, tags, settings.localShortcuts]);

  return (
    <LibraryCommandsContext
      value={{
        ...state,
        deleteSelected: () => (active ? commands.deleteSelected() : Promise.resolve()),
        report: (error) => {
          commands.report(error);
        },
        copy: (id, format) => (active ? commands.copy(id, format) : Promise.resolve())
      }}
    >
      {children}
      <LibraryCopyToast visible={active && state.copiedId !== null} />
      {active && undo !== undefined && (
        <LibraryUndoToast
          undo={undo.run}
          dismiss={() => {
            setUndo(undefined);
          }}
        />
      )}
    </LibraryCommandsContext>
  );
}
