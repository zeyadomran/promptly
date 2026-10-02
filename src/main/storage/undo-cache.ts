import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import type { Snippet } from '../../shared/contracts/domain';

interface UndoEntry {
  snippet: Snippet;
  expiresAt: number;
  bytes: number;
}

export class UndoCache {
  private readonly entries = new Map<string, UndoEntry>();
  private bytes = 0;

  constructor(
    private readonly capacity = 100,
    private readonly byteLimit = 8 * 1024 * 1024,
    private readonly ttl = 30_000
  ) {}

  token(): string {
    return randomUUID();
  }

  save(token: string, snippet: Snippet, now: number): void {
    this.prune(now);
    const bytes = Buffer.byteLength(JSON.stringify(snippet));

    if (bytes > this.byteLimit) return;
    this.entries.set(token, { snippet, expiresAt: now + this.ttl, bytes });
    this.bytes += bytes;
    while (this.entries.size > this.capacity || this.bytes > this.byteLimit) {
      const oldest = this.entries.keys().next().value;

      if (oldest === undefined) break;
      this.remove(oldest);
    }
  }

  get(token: string, now: number): Snippet | undefined {
    this.prune(now);
    return this.entries.get(token)?.snippet;
  }

  remove(token: string): void {
    const entry = this.entries.get(token);

    if (entry === undefined) return;
    this.bytes -= entry.bytes;
    this.entries.delete(token);
  }

  clear(): void {
    this.entries.clear();
    this.bytes = 0;
  }

  private prune(now: number): void {
    for (const [token, entry] of this.entries) {
      if (entry.expiresAt <= now) this.remove(token);
    }
  }
}
