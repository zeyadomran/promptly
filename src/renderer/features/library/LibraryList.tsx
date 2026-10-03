import { useEffect } from 'react';

import { useLibrary } from './library-context';
import { LibraryRow } from './LibraryRow';
import { useLibraryRange } from './use-library-range';
import { useVirtualStyles } from './use-virtual-styles';

export function LibraryList({ regular = false }: { regular?: boolean }) {
  const { state, model } = useLibrary();
  const { scroller, range } = useLibraryRange(
    state.total,
    state.selectedIndex,
    state.revealVersion,
    regular
  );
  const { rows, first, last } = range;
  const scope = useVirtualStyles(range.height, rows);

  useEffect(() => {
    for (let index = first; index <= last; index += 1) {
      if (state.cache.at(index) === undefined) {
        model.ensure(index);
        break;
      }
    }
  }, [first, last, state.version, state.cache, model]);
  return (
    <div
      className="library-scroller"
      ref={scroller}
      role="listbox"
      aria-label="Snippets"
      tabIndex={0}
      aria-busy={state.loading}
      aria-activedescendant={
        state.selectedId !== null &&
        rows.some(
          (row) =>
            row.index === state.selectedIndex &&
            state.cache.at(row.index)?.snippet.id === state.selectedId
        )
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
