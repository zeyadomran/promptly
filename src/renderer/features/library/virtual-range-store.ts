import { ROW_HEIGHT, ROW_STRIDE, selectionScroll, virtualRange } from './virtual-range';

/** Owns DOM observations outside render and publishes immutable range snapshots. */
export class VirtualRangeStore {
  private value = virtualRange(0, 0, 0);
  private listeners = new Set<() => void>();
  private element: HTMLElement | undefined;
  private count = 0;
  private pendingReveal: number | undefined;

  constructor(
    private rowHeight = ROW_HEIGHT,
    private rowStride = ROW_STRIDE
  ) {}

  snapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private measure = (): void => {
    // A hidden shell view has no geometry. Keep its last rows and scroll position.
    if (this.element === undefined || this.element.clientHeight === 0) return;
    if (this.pendingReveal !== undefined) {
      const index = this.pendingReveal;

      this.pendingReveal = undefined;
      this.scrollToIndex(index);
    }

    const next = virtualRange(
      this.count,
      this.element.clientHeight,
      this.element.scrollTop,
      this.rowHeight,
      this.rowStride
    );

    if (
      next.first === this.value.first &&
      next.last === this.value.last &&
      next.height === this.value.height
    )
      return;
    this.value = next;
    for (const listener of this.listeners) listener();
  };

  mount(element: HTMLElement): () => void {
    this.element = element;
    let frame: number | undefined;
    const onScroll = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        this.measure();
      });
    };

    const observer = new ResizeObserver(this.measure);

    observer.observe(element);
    element.addEventListener('scroll', onScroll, { passive: true });
    this.measure();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', onScroll);
      if (frame !== undefined) cancelAnimationFrame(frame);
      this.element = undefined;
    };
  }

  setCount(count: number): void {
    this.count = count;
    this.measure();
  }

  restoreScroll(top: number): void {
    if (this.element === undefined) return;
    this.element.scrollTop = top;
    this.measure();
  }

  scrollToIndex(index: number): void {
    const element = this.element;

    if (element === undefined || index < 0 || index >= this.count) return;
    if (element.clientHeight === 0) {
      this.pendingReveal = index;
      return;
    }

    element.scrollTop = selectionScroll(
      index,
      element.clientHeight,
      element.scrollTop,
      this.rowHeight,
      this.rowStride
    );
    this.measure();
  }
}
