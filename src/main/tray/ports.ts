export interface TrayItem {
  command?: 'open';
  label?: string;
  type?: 'separator' | 'checkbox';
  checked?: boolean;
  enabled?: boolean;
  shortcut?: string;
  run?: () => Promise<void>;
}

/** Only native tray/window effects; menu data and command ownership stay in main. */
export interface TrayHandle {
  isDestroyed: () => boolean;
  setMenu: (items: readonly TrayItem[]) => void;
  setPaused: (paused: boolean) => void;
  setStatus: (message: string) => void;
  destroy: () => void;
}

export interface TrayNative {
  create: () => TrayHandle;
}
import type { CopyService } from '../copy/service';

export interface TrayCommands {
  copy: () => CopyService | undefined;
  prepareTemplate?: (id: string) => Promise<void>;
  updateReady: () => boolean;
  restartForUpdate: () => void;
  open: (kind: 'main' | 'settings') => Promise<void>;
  recover: () => Promise<void>;
  quit: () => void;
  error: () => void;
}
