import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { VirtualRangeStore } from './virtual-range-store';

export function useLibraryRange(count: number, selectedIndex: number, revealVersion: number) {
  const [store] = useState(() => new VirtualRangeStore());
  const scroller = useRef<HTMLDivElement>(null);
  const range = useSyncExternalStore(store.subscribe, store.snapshot);

  useLayoutEffect(() => {
    const element = scroller.current;

    if (element !== null) return store.mount(element);
    return undefined;
  }, [store]);
  useLayoutEffect(() => {
    store.setCount(count);
    store.scrollToIndex(selectedIndex);
  }, [store, count, selectedIndex, revealVersion]);
  return { scroller, range };
}
