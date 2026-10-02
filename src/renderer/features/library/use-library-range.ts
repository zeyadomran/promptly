import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useLibrary } from './library-context';
import { VirtualRangeStore } from './virtual-range-store';

export function useLibraryRange(
  count: number,
  selectedIndex: number,
  revealVersion: number,
  regular = false
) {
  const { scroll, state } = useLibrary();
  const mode = regular ? 'regular' : 'compact';
  const query = JSON.stringify(state.request);
  const [store] = useState(() => new VirtualRangeStore(regular ? 58 : 78, regular ? 60 : 80));
  const scroller = useRef<HTMLDivElement>(null);
  const previous = useRef<{ index: number; reveal: number; query: string } | undefined>(undefined);
  const range = useSyncExternalStore(store.subscribe, store.snapshot);

  useLayoutEffect(() => {
    const element = scroller.current;

    if (element === null) return undefined;
    const saved = scroll.get(mode);

    previous.current = saved;
    const unmount = store.mount(element);
    // Restore after nonce-authorized spacer styles have reached the new surface.
    const frame = requestAnimationFrame(() => {
      const current = previous.current;

      if (
        saved !== undefined &&
        current?.index === saved.index &&
        current.reveal === saved.reveal &&
        current.query === saved.query
      )
        store.restoreScroll(saved.top);
    });

    return () => {
      cancelAnimationFrame(frame);
      const position = previous.current;

      if (position !== undefined) scroll.set(mode, { ...position, top: element.scrollTop });
      unmount();
    };
  }, [mode, scroll, store]);
  useLayoutEffect(() => {
    store.setCount(count);
    const last = previous.current;

    if (last?.index !== selectedIndex || last.reveal !== revealVersion || last.query !== query)
      store.scrollToIndex(selectedIndex);
    previous.current = { index: selectedIndex, reveal: revealVersion, query };
  }, [store, count, selectedIndex, revealVersion, query]);
  return { scroller, range };
}
