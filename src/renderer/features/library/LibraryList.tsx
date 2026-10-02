import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';

import { useLibrary } from './library-context';
import { LibraryRow } from './LibraryRow';
import { useVirtualStyles } from './use-virtual-styles';

export function LibraryList() {
  'use no memo';
  const { state, model } = useLibrary();
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: state.total,
    getScrollElement: () => scroller.current,
    estimateSize: () => 78,
    gap: 2,
    overscan: 4
  });
  const rows = virtualizer.getVirtualItems();
  const scope = useVirtualStyles(virtualizer.getTotalSize(), rows);
  const first = rows[0]?.index ?? 0;
  const last = rows.at(-1)?.index ?? 0;

  useEffect(() => {
    for (let index = first; index <= last; index += 1) {
      if (state.cache.at(index) === undefined) {
        model.ensure(index);
        break;
      }
    }
  }, [first, last, state.version, state.cache, model]);
  useEffect(() => {
    if (state.selectedIndex >= 0) virtualizer.scrollToIndex(state.selectedIndex, { align: 'auto' });
  }, [state.selectedIndex, virtualizer]);
  return (
    <div
      className="library-scroller"
      ref={scroller}
      role="listbox"
      aria-label="Snippets"
      tabIndex={0}
      aria-busy={state.loading}
      aria-activedescendant={
        state.selectedId !== null && rows.some((row) => row.index === state.selectedIndex)
          ? `snippet-${state.selectedId}`
          : undefined
      }
    >
      <div className={`library-virtual-space ${scope}`}>
        {rows.map((row) => {
          const item = state.cache.at(row.index);

          return item === undefined ? (
            <div
              key={row.index}
              aria-hidden="true"
              className={`library-row library-row-loading virtual-row-${String(row.index)}`}
            />
          ) : (
            <LibraryRow
              key={item.snippet.id}
              snippet={item.snippet}
              ranges={item.ranges}
              index={row.index}
              positionClass={`virtual-row-${String(row.index)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
