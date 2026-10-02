import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { Popover, PopoverAnchor } from '../../components/ui/popover';
import { LibraryTagActionsContext } from '../library/library-commands';
import { useLibrary } from '../library/library-context';
import { TagPickerController } from './tag-picker-controller';
import { TagPickerContent } from './TagPickerContent';

export function TagPickerProvider({ children }: { children: ReactNode }) {
  const { model, state: library, selection, searchRef } = useLibrary();
  const [picker] = useState(() => new TagPickerController(window.promptly));
  const state = useSyncExternalStore(picker.subscribe, picker.snapshot);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const anchor = useMemo(() => ({ current: trigger }), [trigger]);
  const captureTrigger = (element?: HTMLElement) => {
    const active = document.activeElement;

    setTrigger(
      element ??
        (active instanceof HTMLElement && active !== document.body ? active : searchRef.current)
    );
  };

  useEffect(() => {
    picker.start();
    return () => {
      picker.close();
    };
  }, [picker]);
  return (
    <LibraryTagActionsContext
      value={{
        createTag: (element) => {
          captureTrigger(element);
          picker.openCatalog();
        },
        editSelectedTags: (id, element) => {
          captureTrigger(element);
          void picker.openSnippet(id);
        },
        removeTag: (id, tagId) => picker.remove(id, tagId),
        busy: state.busy,
        error: state.error
      }}
    >
      <Popover
        open={state.open}
        onOpenChange={(open) => {
          if (!open) picker.dismiss();
        }}
      >
        {children}
        <PopoverAnchor virtualRef={anchor} />
        <TagPickerContent
          picker={picker}
          state={state}
          tags={library.tags}
          selectedIds={state.targetId === null ? library.request.tagIds : state.selectedIds}
          chooseFilter={(id) => {
            const current = model.snapshot().request;
            const tagIds = current.tagIds.includes(id)
              ? current.tagIds.filter((tagId) => tagId !== id)
              : [...current.tagIds, id];

            if (tagIds.length <= 100) model.query({ ...current, tagIds, untagged: false });
          }}
          restoreFocus={() => {
            if (trigger?.isConnected === true && !trigger.matches(':disabled')) trigger.focus();
            else selection.focusSearch();
          }}
        />
      </Popover>
      {!state.open && state.error !== undefined && (
        <p className="library-error" role="alert">
          {state.error}
        </p>
      )}
    </LibraryTagActionsContext>
  );
}
