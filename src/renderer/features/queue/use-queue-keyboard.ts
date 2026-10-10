import { useEffect } from 'react';

import { keyboardFocus } from '../library/keyboard-focus';
import { usePreferences } from '../settings/settings-context';
import { useQueue } from './queue-context';
import { queueKeyCommand } from './queue-keyboard';
import { queueItems } from './queue-state';

export function useQueueKeyboard(
  active: boolean,
  copy: (id: string, returnToApp?: boolean) => void
) {
  const { state, model } = useQueue();
  const { settings } = usePreferences();

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const current = model.snapshot();
      const handle = event
        .composedPath()
        .some(
          (element) => element instanceof HTMLElement && element.matches('[data-queue-drag-handle]')
        );
      const command = queueKeyCommand(
        {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          repeat: event.repeat,
          isComposing: event.isComposing || event.key === 'Process',
          altGraph: event.getModifierState('AltGraph')
        },
        {
          active: active && !current.pending && !current.loading,
          prevented: event.defaultPrevented,
          focus: handle ? 'library' : keyboardFocus(event),
          selected: current.selectedId !== null,
          open: current.tab === 'open'
        },
        settings.localShortcuts
      );

      if (command === undefined) return;
      event.preventDefault();
      const id = current.selectedId;
      const items = queueItems(current);

      if (command === 'next' || command === 'previous') {
        const index = items.findIndex((candidate) => candidate.id === id);
        const item =
          items[Math.max(0, Math.min(items.length - 1, index + (command === 'next' ? 1 : -1)))];

        if (item !== undefined) model.select(item.id);
      } else if (command === 'hide') {
        void window.promptly
          .setWindowVisibility({ visible: false })
          .then((result) => {
            if (!result.ok) model.report(result.error.message);
          })
          .catch(() => {
            model.report('Unable to hide the window.');
          });
      } else if (id !== null) {
        if (command === 'copy' || command === 'copy-return') copy(id, command === 'copy-return');
        if (command === 'complete') void model.complete(id);
        if (command === 'delete') void model.delete(id);
        if (command === 'move-up' || command === 'move-down')
          void model.move(id, command === 'move-up' ? -1 : 1);
      }
    };

    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
    };
  }, [active, copy, model, state.tab, settings.localShortcuts]);
}
