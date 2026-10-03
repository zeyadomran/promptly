import { MainCopyOwner } from '../copy/main-owner';
import type { CopyService } from '../copy/service';
import type { SettingsController } from '../settings/controllers';
import type { Shortcuts } from '../shortcuts/service';
import type { StorageClient } from '../storage/client';
import type { TrayHandle, TrayItem, TrayNative } from './ports';

interface TrayCommands {
  copy: () => CopyService | undefined;
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

  constructor(
    private readonly storage: Pick<StorageClient, 'call'>,
    private readonly shortcuts: Shortcuts,
    private readonly native: TrayNative,
    private readonly commands: TrayCommands
  ) {}

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
            limit: 5
          });

          if (!this.available) return;
          if (handle !== this.handle || owner !== this.owner) continue;
          if (!result.ok) throw new Error('Recent tray snippets are unavailable.');
          if (owner === undefined) return;
          const items: TrayItem[] = result.value.items.map((snippet) => ({
            label: this.label(snippet.text),
            run: () => this.copy(snippet.id, owner)
          }));

          const menu: TrayItem[] = [
            { label: 'Open Promptly', run: () => this.open('main') },
            { type: 'separator' },
            ...items,
            { type: 'separator' },
            {
              label: this.shortcuts.status.capturePaused ? 'Resume capture' : 'Pause capture',
              run: async () => {
                if (!this.available) return;
                this.shortcuts.setPaused(!this.shortcuts.status.capturePaused);
                await this.refresh();
              }
            },
            { label: 'Settings', run: () => this.open('settings') },
            {
              label: 'Quit',
              run: () => {
                this.commands.quit();
                return Promise.resolve();
              }
            }
          ];

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

  private label(text: string): string {
    const plain = Array.from(text, (unit) =>
      unit.charCodeAt(0) < 32 || unit.charCodeAt(0) === 127 ? ' ' : unit
    ).join('');
    const units = Array.from(plain.replace(/\s+/g, ' ').trim());

    return (units.slice(0, 50).join('') + (units.length > 50 ? '…' : '')).replaceAll('&', '&&');
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
    this.handle?.setStatus(
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
    this.owner?.close();
    this.owner = undefined;
    this.handle?.destroy();
    this.handle = undefined;
  }

  stopCommands(): void {
    // Settings still owns apply/rollback until its accepted work has drained.
    this.commandsStopped = true;
    this.owner?.close();
  }

  async close(): Promise<void> {
    this.stopCommands();
    this.closing = true;
    this.retire();
    await this.refreshing;
  }
}
