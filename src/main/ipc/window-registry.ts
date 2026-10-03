import type { IpcMainInvokeEvent, WebContents } from 'electron';

interface TrustedWindow {
  contents: WebContents;
  url: string;
}

export class WindowRegistry {
  private readonly windows = new Map<number, TrustedWindow>();
  private readonly subscribers = new Set<number>();

  get subscriberCount(): number {
    return this.subscribers.size;
  }

  register(contents: WebContents, url: string): void {
    if (this.windows.has(contents.id)) throw new Error('Window is already registered.');
    this.windows.set(contents.id, { contents, url: new URL(url).href });
    contents.once('destroyed', () => {
      this.windows.delete(contents.id);
      this.subscribers.delete(contents.id);
    });
    contents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => {
      if (isMainFrame) this.subscribers.delete(contents.id);
    });
  }

  isAuthorized(event: Pick<IpcMainInvokeEvent, 'sender' | 'senderFrame'>): boolean {
    const trusted = this.windows.get(event.sender.id);

    return (
      trusted !== undefined &&
      !event.sender.isDestroyed() &&
      event.sender === trusted.contents &&
      event.senderFrame === event.sender.mainFrame &&
      event.senderFrame.url === trusted.url
    );
  }

  subscribe(event: IpcMainInvokeEvent): boolean {
    if (!this.isAuthorized(event)) return false;
    this.subscribers.add(event.sender.id);
    return true;
  }

  unsubscribe(event: IpcMainInvokeEvent): void {
    if (this.isAuthorized(event)) this.subscribers.delete(event.sender.id);
  }

  broadcast(channel: string, value: unknown, subscribedOnly = true): void {
    for (const id of subscribedOnly ? this.subscribers : this.windows.keys()) {
      const trusted = this.windows.get(id);

      if (trusted === undefined || trusted.contents.isDestroyed()) {
        this.subscribers.delete(id);
        continue;
      }

      try {
        if (trusted.contents.mainFrame.url === trusted.url) trusted.contents.send(channel, value);
      } catch {
        // A renderer can retire between validation and send; keep other subscribers current.
        this.subscribers.delete(id);
        console.warn('Unable to notify a retired Promptly window.');
      }
    }
  }
}
