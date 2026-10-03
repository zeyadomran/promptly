export interface TrayItem {
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
