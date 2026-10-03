import type { UpdateState } from '../../shared/contracts/updates';

export interface UpdatePorts {
  available: boolean;
  findRelease: () => Promise<string | undefined>;
  apply: (version: string) => Promise<void>;
  restart: () => void;
  notify: (version: string, open: () => void) => void;
  openSettings: () => Promise<void>;
  publish: (state: UpdateState) => void;
}

export class UpdateService {
  private current: UpdateState;
  private closed = false;
  private restarting = false;
  private readonly isClosed = () => this.closed;
  private readonly notified = new Set<string>();

  constructor(private readonly ports: UpdatePorts) {
    this.current = {
      revision: 0,
      status: ports.available ? 'idle' : 'unavailable',
      message: ports.available
        ? 'Checks on startup. Updates are always your choice.'
        : 'Updates are available in the installed Windows app.',
      focusRequest: 0
    };
  }

  get state(): UpdateState {
    return { ...this.current };
  }

  private set(change: Partial<UpdateState>): void {
    if (this.closed) return;
    this.current = { ...this.current, ...change, revision: this.current.revision + 1 };
    this.ports.publish(this.state);
  }

  async check(notify = false): Promise<UpdateState> {
    if (
      this.closed ||
      !this.ports.available ||
      ['checking', 'updating', 'ready'].includes(this.current.status)
    )
      return this.state;
    this.set({ status: 'checking', message: 'Checking for updates…' });
    try {
      const version = await this.ports.findRelease();

      if (this.isClosed()) return this.state;
      this.set({
        status: version === undefined ? 'current' : 'available',
        version,
        message: version === undefined ? 'No updates found.' : `Promptly ${version} is available.`
      });
      if (notify && version !== undefined && !this.notified.has(version)) {
        this.notified.add(version);
        try {
          this.ports.notify(version, () => {
            if (this.closed) return;
            this.set({ focusRequest: this.current.focusRequest + 1 });
            void this.ports.openSettings().catch(() => undefined);
          });
        } catch {
          /* Notification delivery must not hide an available update. */
        }
      }
    } catch {
      this.set({
        status: 'error',
        message: 'Unable to check for updates. Check your connection and try again.'
      });
    }

    return this.state;
  }

  async install(): Promise<UpdateState> {
    const version = this.current.version;

    if (this.closed || this.current.status !== 'available' || version === undefined)
      return this.state;
    this.set({
      status: 'updating',
      message: `Updating to ${version}… You can keep using Promptly.`
    });
    try {
      await this.ports.apply(version);
      this.set({
        status: 'ready',
        message: `Version ${version} is installed. Restart when you’re ready.`
      });
    } catch {
      this.set({
        status: 'available',
        message: 'Unable to update. Check your connection and try Update again.'
      });
    }

    return this.state;
  }

  restart(): void {
    if (this.closed || this.restarting || this.current.status !== 'ready') return;
    this.restarting = true;
    this.ports.restart();
  }

  close(): void {
    this.closed = true;
  }
}
