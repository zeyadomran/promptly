import type { PreparedCopy } from '../../shared/contracts/workflow-copy';
import type { TransferOwner } from '../storage/transfer/requests';

export interface PreparedToken {
  prepared: PreparedCopy;
  owner: TransferOwner;
  invalidated: boolean;
  stop: () => void;
}

/** Capabilities are tied to exact renderer lifetimes, never only a reusable sender ID. */
export class PreparedTokens {
  private readonly entries = new Map<string, PreparedToken>();
  constructor(private readonly now: () => number) {}
  put(prepared: PreparedCopy, owner: TransferOwner): boolean {
    this.purge();
    for (const [token, entry] of this.entries) if (entry.owner.id === owner.id) this.remove(token);
    if (this.entries.size >= 16 || !owner.isAlive()) return false;
    const stop = owner.onClose(() => {
      this.remove(prepared.token);
    });

    this.entries.set(prepared.token, { prepared, owner, stop, invalidated: false });
    return true;
  }
  get(token: string, owner: TransferOwner): PreparedToken | undefined {
    this.purge();
    const entry = this.entries.get(token);

    return entry?.owner.id === owner.id && entry.owner.isAlive() && owner.isAlive()
      ? entry
      : undefined;
  }
  remove(token: string): void {
    const entry = this.entries.get(token);

    this.entries.delete(token);
    entry?.stop();
  }
  invalidateDraft(senderId: number, draftId: string, revision: number): void {
    for (const entry of this.entries.values()) {
      const source = entry.prepared.source;

      if (
        entry.owner.id === senderId &&
        source.kind === 'draft' &&
        source.draftId === draftId &&
        source.draftRevision !== revision
      )
        entry.invalidated = true;
    }
  }
  private purge(): void {
    for (const [token, entry] of this.entries)
      if (entry.prepared.expiresAt <= this.now() || !entry.owner.isAlive()) this.remove(token);
  }
  clear(): void {
    for (const token of this.entries.keys()) this.remove(token);
  }
}
