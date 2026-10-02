import type { TransferOwner } from './requests';

interface OwnedPreview {
  ownerId: number;
  stop: () => void;
  timer: ReturnType<typeof setTimeout>;
}

export class OwnedPreviews {
  private readonly tokens = new Map<string, OwnedPreview>();

  constructor(private readonly discard: (token: string) => Promise<unknown>) {}

  belongsTo(token: string, owner: TransferOwner): boolean {
    return this.tokens.get(token)?.ownerId === owner.id && owner.isAlive();
  }

  remember(token: string, owner: TransferOwner): void {
    const retire = () => {
      void this.forget(token).catch(() => undefined);
    };

    this.tokens.set(token, {
      ownerId: owner.id,
      stop: owner.onClose(retire),
      timer: setTimeout(retire, 5 * 60_000)
    });
  }

  async forget(token: string): Promise<void> {
    const preview = this.tokens.get(token);

    if (preview === undefined) return;
    this.tokens.delete(token);
    preview.stop();
    clearTimeout(preview.timer);
    await this.discard(token);
  }

  async removeOwner(ownerId: number): Promise<void> {
    for (const [token, preview] of this.tokens) {
      if (preview.ownerId === ownerId) await this.forget(token);
    }
  }

  async clear(): Promise<void> {
    await Promise.allSettled([...this.tokens.keys()].map((token) => this.forget(token)));
  }
}
