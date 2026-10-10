import type { PointerEvent } from 'react';
import { useRef, useState } from 'react';

export function useBundleReorder(
  pending: boolean,
  reorder: (id: string, beforeId: string | undefined) => void
) {
  const dragged = useRef<{ id: string; pointer: number } | undefined>(undefined);
  const [draggedId, setDraggedId] = useState<string>();
  const finish = () => {
    dragged.current = undefined;
    setDraggedId(undefined);
  };

  return {
    draggedId,
    start: (id: string, event: PointerEvent<HTMLButtonElement>) => {
      if (pending || event.button !== 0) return;
      dragged.current = { id, pointer: event.pointerId };
      setDraggedId(id);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    move: (event: PointerEvent<HTMLButtonElement>) => {
      const active = dragged.current;

      if (pending || active?.pointer !== event.pointerId) return;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-bundle-order-id]');
      const targetId = target?.dataset['bundleOrderId'];

      if (
        target === null ||
        target === undefined ||
        targetId === undefined ||
        targetId === active.id
      )
        return;
      const bounds = target.getBoundingClientRect();
      const beforeId =
        event.clientY < bounds.top + bounds.height / 2
          ? targetId
          : target.nextElementSibling instanceof HTMLElement
            ? target.nextElementSibling.dataset['bundleOrderId']
            : undefined;

      reorder(active.id, beforeId);
    },
    finish
  };
}
