import { MainCopyOwner } from '../copy/main-owner';
import type { CopyService } from '../copy/service';
import type { SettingsController } from '../settings/controllers';
import type { Shortcuts } from '../shortcuts/service';
import type { StorageClient } from '../storage/client';
import { TrayFeedback } from './feedback';
import { trayLabel } from './label';
import { trayMenu } from './menu';
import type { TrayHandle, TrayItem, TrayNative } from './ports';

interface TrayCommands {
  copy: () => CopyService | undefined;
  updateReady: () => boolean;
  restartForUpdate: () => void;
  open: (kind: 'main' | 'settings') => Promise<void>;
  recover: () => Promise<void>;
  quit: () => void;
  error: () => void;
}

/** Native menu ownership; persistent data and capture pause retain their existing authorities. */
export class TrayCoordinator {
  private handle: TrayHandle | undefined;
  private owner: MainCopyOwner | undefined;
  private closing = false;
  private commandsStopped = false;
  private version = 0;
  private refreshing: Promise<void> | undefined;
  private readonly feedback: TrayFeedback;

  constructor(
    private readonly storage: Pick<StorageClient, 'call'>,
    private readonly shortcuts: Shortcuts,
    private readonly native: TrayNative,
    private readonly commands: TrayCommands
  ) {
    this.feedback = new TrayFeedback(commands.error);
  }

  get available(): boolean {
    return !this.closing && this.handle !== undefined && !this.handle.isDestroyed();
  }

  readonly controller: SettingsController = {
    name: 'system tray',
    optionalStartup: true,
    keys: ['showInTray'],
    apply: (settings) => this.setVisible(settings.showInTray),
    quarantine: () => {
      this.retire();
      if (!this.commandsStopped) void this.commands.recover().catch(this.commands.error);
    }
  };

  private async setVisible(visible: boolean): Promise<void> {
    if (this.closing) throw new Error('Tray is shutting down.');
    if (!visible) {
      if (this.handle !== undefined && !this.commandsStopped) await this.commands.recover();
      this.retire();
      return;
    }

    if (!this.available) {
      this.retire();
      this.handle = this.native.create();
      this.owner = new MainCopyOwner();
      if (this.commandsStopped) this.owner.close();
    }

    await this.refresh();
    if (!this.available) throw new Error('Windows tray creation failed.');
  }

  refresh(): Promise<void> {
    this.version += 1;
    if (!this.available) return Promise.resolve();
    this.handle?.setPaused(this.shortcuts.status.capturePaused);
    if (this.refreshing !== undefined) return this.refreshing;
    this.refreshing = Promise.resolve()
      .then(async () => {
        let seen: number;

        do {
          seen = this.version;
          const handle = this.handle;
          const owner = this.owner;
          const result = await this.storage.call('searchSnippets', {
            query: '',
            tagIds: [],
            untagged: false,
            sort: 'newest',
            offset: 0,
            limit: 5,
            preview: 'tray'
          });

          if (!this.available) return;
          if (handle !== this.handle || owner !== this.owner) continue;
          if (!result.ok) throw new Error('Recent tray snippets are unavailable.');
          if (owner === undefined) return;
          const items: TrayItem[] = result.value.items.map((snippet) => ({
            label: trayLabel(snippet.text),
            run: () => this.copy(snippet.id, owner)
          }));

          const menu = trayMenu(items, this.shortcuts.status, {
            open: (kind) => this.open(kind),
            pause: async () => {
              if (!this.available) return;
              this.shortcuts.setPaused(!this.shortcuts.status.capturePaused);
              await this.refresh();
            },
            updateReady: this.commands.updateReady,
            restartForUpdate: this.commands.restartForUpdate,
            quit: this.commands.quit
          });

          handle?.setMenu(menu.map((item) => this.ownedItem(item, owner)));
        } while (seen !== this.version);
      })
      .finally(() => {
        this.refreshing = undefined;
      });
    return this.refreshing;
  }

  changed(): void {
    void Promise.resolve()
      .then(() => this.refresh())
      .catch(this.commands.error);
  }

  private ownedItem(item: TrayItem, owner: MainCopyOwner): TrayItem {
    const run = item.run;

    return run === undefined
      ? item
      : {
          ...item,
          run: () => (this.isCurrent(owner) ? run() : Promise.resolve())
        };
  }

  private async copy(id: string, owner: MainCopyOwner): Promise<void> {
    const service = this.commands.copy();

    if (service === undefined || !this.available || !owner.isAlive()) return;
    const result = await service.copyFromMain({ id, format: 'text' }, owner);

    if (!this.isCurrent(owner)) return;
    this.feedback.show(
      this.handle,
      !result.ok
        ? 'Copy failed'
        : result.value.warnings.length > 0
          ? 'Copied; statistics unconfirmed'
          : 'Copied'
    );
    if (!result.ok) this.commands.error();
  }

  private open(kind: 'main' | 'settings'): Promise<void> {
    return this.available ? this.commands.open(kind) : Promise.resolve();
  }

  private isCurrent(owner: MainCopyOwner): boolean {
    return !this.commandsStopped && this.available && owner === this.owner && owner.isAlive();
  }

  private retire(): void {
    this.feedback.retire();
    this.owner?.close();
    this.owner = undefined;
    this.handle?.destroy();
    this.handle = undefined;
  }

  stopCommands(): void {
    // Settings still owns apply/rollback until its accepted work has drained.
    this.commandsStopped = true;
    this.feedback.retire();
    this.owner?.close();
  }

  async close(): Promise<void> {
    this.stopCommands();
    this.closing = true;
    this.retire();
    await this.refreshing;
  }
}
