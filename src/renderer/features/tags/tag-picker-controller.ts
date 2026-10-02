import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { TagSummary } from '../../../shared/contracts/domain';
import { tagInputNameSchema } from '../../../shared/contracts/domain';

type PickerBridge = Pick<
  DesktopBridge,
  'getSnippet' | 'ensureTag' | 'setTagMembership' | 'subscribeChanges'
>;
interface PickerState {
  open: boolean;
  targetId: string | null;
  query: string;
  selectedIds: string[];
  loading: boolean;
  busy: boolean;
  error: string | undefined;
}

/** Owns a picker session, never a second tag catalog or a mutable selection capability. */
export class TagPickerController {
  private state: PickerState = {
    open: false,
    targetId: null,
    query: '',
    selectedIds: [],
    loading: false,
    busy: false,
    error: undefined
  };
  private listeners = new Set<() => void>();
  private session = 0;
  private readVersion = 0;
  private disposed = false;
  private unsubscribe: (() => void) | undefined;

  constructor(private bridge: PickerBridge) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<PickerState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  start(): void {
    this.disposed = false;
    this.unsubscribe ??= this.bridge.subscribeChanges((change) => {
      if (
        this.state.open &&
        (change.domains.includes('tags') || change.domains.includes('snippets'))
      )
        void this.read();
    });
  }
  openCatalog(): void {
    this.session += 1;
    this.readVersion += 1;
    this.publish({
      open: true,
      targetId: null,
      query: '',
      selectedIds: [],
      error: undefined,
      loading: false
    });
  }
  openSnippet(id: string): Promise<void> {
    this.session += 1;
    this.publish({ open: true, targetId: id, query: '', selectedIds: [], error: undefined });
    return this.read();
  }
  dismiss(): void {
    this.session += 1;
    this.readVersion += 1;
    this.publish({ open: false, loading: false });
  }
  query(query: string): void {
    this.publish({ query, error: undefined });
  }
  matches(tags: readonly TagSummary[]): TagSummary[] {
    const query = this.state.query.trim().toLowerCase();

    return tags.filter((tag) => tag.name.includes(query));
  }
  private async read(): Promise<void> {
    const id = this.state.targetId;
    const session = this.session;
    const version = ++this.readVersion;

    if (id === null || !this.state.open) return;
    this.publish({ loading: true });
    try {
      const result = await this.bridge.getSnippet({ id });

      if (session !== this.session || version !== this.readVersion) return;
      this.publish(
        result.ok
          ? { selectedIds: result.value.snippet.tags.map((tag) => tag.id), error: undefined }
          : { selectedIds: [], error: result.error.message }
      );
    } catch {
      if (session === this.session && version === this.readVersion)
        this.publish({ error: 'Unable to read snippet tags.' });
    } finally {
      if (session === this.session && version === this.readVersion)
        this.publish({ loading: false });
    }
  }
  private async write(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>
  ): Promise<void> {
    if (this.disposed || this.state.busy) return;
    const session = this.session;

    this.publish({ busy: true, error: undefined });
    try {
      const result = await action();

      if (session !== this.session) return;
      if (!result.ok) this.publish({ error: result.error?.message ?? 'Unable to update tags.' });
      else await this.read();
    } catch {
      if (session === this.session) this.publish({ error: 'Unable to update tags.' });
    } finally {
      this.publish({ busy: false });
    }
  }
  create(): Promise<void> {
    if (!this.state.open || this.state.loading) return Promise.resolve();
    const name = tagInputNameSchema.safeParse(this.state.query);
    const id = this.state.targetId;

    if (!name.success) {
      this.publish({ error: 'Use 1–64 characters of well-formed Unicode for the tag name.' });
      return Promise.resolve();
    }

    return this.write(() =>
      this.bridge.ensureTag({ name: name.data, ...(id === null ? {} : { snippetId: id }) })
    );
  }
  toggle(tagId: string): Promise<void> {
    const id = this.state.targetId;
    const assigned = !this.state.selectedIds.includes(tagId);

    if (!this.state.open || id === null || this.state.loading) return Promise.resolve();
    return this.write(() => this.bridge.setTagMembership({ id, tagId, assigned }));
  }
  remove(id: string, tagId: string): Promise<void> {
    return this.write(() => this.bridge.setTagMembership({ id, tagId, assigned: false }));
  }
  close(): void {
    this.disposed = true;
    this.session += 1;
    this.readVersion += 1;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
