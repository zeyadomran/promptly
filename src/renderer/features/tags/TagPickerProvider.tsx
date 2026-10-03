import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { Popover, PopoverAnchor } from '../../components/ui/popover';
import { LibraryTagActionsContext } from '../library/library-commands';
import { useLibrary } from '../library/library-context';
import { TagPickerController } from './tag-picker-controller';
import { TagPickerContent } from './TagPickerContent';

export function TagPickerProvider({
  children,
  active = true
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const { model, state: library, selection, searchRef } = useLibrary();
  const [picker] = useState(() => new TagPickerController(window.promptly));
  const state = useSyncExternalStore(picker.subscribe, picker.snapshot);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const rectangle = useRef<DOMRect | undefined>(undefined);
  const anchor = useMemo(
    () => ({
      current:
        trigger === null
          ? null
          : {
              getBoundingClientRect: () => {
                if (trigger.isConnected && getComputedStyle(trigger).visibility !== 'hidden')
                  rectangle.current = trigger.getBoundingClientRect();
                return rectangle.current ?? trigger.getBoundingClientRect();
              }
            }
    }),
    [trigger]
  );
  const captureTrigger = (element?: HTMLElement) => {
    const focusedElement = document.activeElement;

    const next =
      element ??
      (focusedElement instanceof HTMLElement && focusedElement !== document.body
        ? focusedElement
        : searchRef.current);

    rectangle.current = next?.getBoundingClientRect();
    setTrigger(next);
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
        activeTrigger: state.open ? (trigger?.dataset['tagPickerTrigger'] ?? null) : null,
        busy: state.busy,
        error: state.error
      }}
    >
      <Popover
        open={active && state.open}
        onOpenChange={(open) => {
          if (active && !open && document.querySelector('[data-shell-library][hidden]') === null)
            picker.dismiss();
        }}
      >
        {children}
        <PopoverAnchor virtualRef={anchor} />
        {active && (
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
            untagged={library.request.untagged}
            chooseUntagged={() => {
              const current = model.snapshot().request;

              model.query({ ...current, tagIds: [], untagged: !current.untagged });
            }}
            clearFilters={() => {
              model.query({ ...model.snapshot().request, tagIds: [], untagged: false });
            }}
            restoreFocus={() => {
              if (document.querySelector('[data-shell-library][hidden]') !== null) return;
              if (
                trigger?.isConnected === true &&
                !trigger.matches(':disabled') &&
                getComputedStyle(trigger).visibility !== 'hidden'
              )
                trigger.focus();
              else {
                const add = trigger
                  ?.closest('.tag-overflow-row')
                  ?.querySelector<HTMLButtonElement>('[data-overflow-end] button:not(:disabled)');

                if (
                  add !== undefined &&
                  add !== null &&
                  getComputedStyle(add).visibility !== 'hidden'
                )
                  add.focus();
                else selection.focusSearch();
              }
            }}
          />
        )}
      </Popover>
      {!state.open && state.error !== undefined && (
        <p className="library-error" role="alert">
          {state.error}
        </p>
      )}
    </LibraryTagActionsContext>
  );
}
