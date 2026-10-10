import type { PointerEvent } from 'react';
import { useRef, useState } from 'react';

import type { QueueModel } from './queue-model';

/** Pointer movement previews order; dropping submits one authoritative permutation. */
export function useQueueReorder(
  model: QueueModel,
  ids: string[],
  disabled: boolean,
  revision: number
) {
  const active = useRef<
    { id: string; pointer: number; before: string | undefined; revision: number } | undefined
  >(undefined);
  const [preview, setPreview] = useState<{ ids: string[]; revision: number }>();
  const cancel = () => {
    active.current = undefined;
    setPreview(undefined);
  };

  const ordered =
    !disabled && preview?.revision === revision && preview.ids.length === ids.length
      ? preview.ids
      : ids;

  return {
    ids: ordered,
    row: (id: string) => ({
      active: !disabled && active.current?.revision === revision && active.current.id === id,
      start: (event: PointerEvent<HTMLButtonElement>) => {
        if (disabled || event.button !== 0) return;
        const index = ids.indexOf(id);

        active.current = { id, pointer: event.pointerId, before: ids[index + 1], revision };
        setPreview({ ids, revision });
        model.select(id);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      move: (event: PointerEvent<HTMLButtonElement>) => {
        const current = active.current;

        if (disabled || current?.pointer !== event.pointerId) return;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>('[data-queue-id]');
        const targetId = target?.dataset['queueId'];

        if (
          target === null ||
          target === undefined ||
          targetId === undefined ||
          targetId === current.id
        )
          return;
        const bounds = target.getBoundingClientRect();
        const before =
          event.clientY < bounds.top + bounds.height / 2
            ? targetId
            : target.nextElementSibling instanceof HTMLElement
              ? target.nextElementSibling.dataset['queueId']
              : undefined;
        const next = ordered.filter((candidate) => candidate !== current.id);
        const index = before === undefined ? next.length : next.indexOf(before);

        if (index < 0 || before === current.id) return;
        next.splice(index, 0, current.id);
        current.before = before;
        setPreview({ ids: next, revision });
      },
      drop: () => {
        const current = active.current;

        cancel();
        if (current !== undefined && !disabled && current.revision === revision)
          void model.reorder(current.id, current.before);
      },
      cancel
    })
  };
}
