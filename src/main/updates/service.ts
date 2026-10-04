import {
  type UpdateProgress,
  updateProgressSchema,
  type UpdateState
} from '../../shared/contracts/updates';

export interface UpdatePorts {
  available: boolean;
  findRelease: () => Promise<string | undefined>;
  apply: (version: string, progress: (progress: UpdateProgress) => void) => Promise<void>;
  restart: () => void;
  notify: (version: string, open: () => void) => void;
  openSettings: () => Promise<void>;
  publish: (state: UpdateState) => void;
}

export class UpdateService {
  private current: UpdateState;
  private closed = false;
  private restarting = false;
  private attempt = 0;
  private readonly isClosed = () => this.closed;
  private readonly notified = new Set<string>();

  constructor(private readonly ports: UpdatePorts) {
    this.current = {
      revision: 0,
      status: ports.available ? 'idle' : 'unavailable',
      message: ports.available
        ? 'Checks whenever Promptly opens. Updates are always your choice.'
        : 'Updates are available in the installed Windows app.',
      focusRequest: 0
    };
  }

  get state(): UpdateState {
    return {
      ...this.current,
      ...(this.current.progress === undefined ? {} : { progress: { ...this.current.progress } })
    };
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
      ['checking', 'updating', 'ready'].includes(this.current.status) ||
      // Automatic window-open checks must preserve an explicit retry action.
      (notify &&
        (this.current.retryOperation === 'install' || this.current.retryOperation === 'restart'))
    )
      return this.state;
    this.set({
      status: 'checking',
      version: undefined,
      progress: undefined,
      retryOperation: undefined,
      message: 'Checking for updates…'
    });
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
        retryOperation: 'check',
        message: 'Unable to check for updates. Check your connection and try again.'
      });
    }

    return this.state;
  }

  async install(): Promise<UpdateState> {
    const version = this.current.version;

    if (
      this.closed ||
      !(
        this.current.status === 'available' ||
        (this.current.status === 'error' && this.current.retryOperation === 'install')
      ) ||
      version === undefined
    )
      return this.state;
    const attempt = ++this.attempt;

    this.set({
      status: 'updating',
      progress: undefined,
      retryOperation: undefined,
      message: `Downloading Promptly ${version}. You can keep using Promptly.`
    });
    try {
      await this.ports.apply(version, (progress) => {
        if (this.closed || this.current.status !== 'updating' || attempt !== this.attempt) return;
        const parsed = updateProgressSchema.safeParse(progress);

        if (parsed.success) this.set({ progress: parsed.data });
      });
      this.set({
        status: 'ready',
        progress: undefined,
        message: `Version ${version} is installed. Restart when you’re ready.`
      });
    } catch {
      this.set({
        status: 'error',
        progress: undefined,
        retryOperation: 'install',
        message: 'Unable to update. Check your connection and retry the download.'
      });
    }

    return this.state;
  }

  restart(): void {
    if (
      this.closed ||
      this.restarting ||
      !(
        this.current.status === 'ready' ||
        (this.current.status === 'error' && this.current.retryOperation === 'restart')
      )
    )
      return;
    this.restarting = true;
    try {
      this.ports.restart();
    } catch {
      this.restarting = false;
      this.set({
        status: 'error',
        retryOperation: 'restart',
        message: 'Unable to restart for the update. Try restarting again.'
      });
    }
  }

  close(): void {
    this.closed = true;
  }
}
