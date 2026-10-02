import type { SettingsController } from './controllers';

export interface DockVisibility {
  show: () => Promise<void>;
  hide: () => void;
  isVisible: () => boolean;
}

export const dockDeadlineMs = 5000;

/** show() cannot be canceled. Reconcile late completion with the latest target. */
export function createDockController(dock: DockVisibility | undefined): SettingsController {
  let target: boolean | undefined;
  let lateFailure: unknown;

  function reconcile(): void {
    if (dock === undefined) throw new Error('Dock is unavailable.');
    if (target === false) dock.hide();
    if (target !== undefined && dock.isVisible() !== target)
      throw new Error('Dock preference was rejected.');
  }

  return {
    name: 'dock icon',
    keys: ['showDockIcon'],
    apply: async (settings) => {
      if (dock === undefined) throw new Error('Dock is unavailable.');
      if (lateFailure !== undefined) throw new Error('Dock recovery failed. Restart Promptly.');
      target = settings.showDockIcon;
      if (!target || dock.isVisible()) {
        reconcile();
        return;
      }

      let expired = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const completion = dock.show().then(() => {
        try {
          reconcile();
        } catch (error) {
          if (expired) {
            lateFailure = error;
            console.error('Unable to recover a late Dock operation:', error);
          }

          throw error;
        }
      });
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error('Dock operation timed out.'));
        }, dockDeadlineMs);
      });

      try {
        await Promise.race([completion, deadline]);
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
