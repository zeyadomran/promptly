import { screen } from 'electron';

import type { CaptureService } from '../capture/service';
import type { SettingsService } from '../settings/service';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { createToastWindow } from './create-toast-window';
import { CaptureToastService } from './service';

export function desktopConfirmation(
  capture: CaptureService,
  settings: SettingsService,
  lifecycle: () => WindowLifecycle | undefined
) {
  const preferences = () => ({
    enabled: settings.current.settings.showConfirmationToast,
    theme: settings.current.settings.theme
  });
  const service = new CaptureToastService(
    {
      create: createToastWindow,
      openPromptly: async () => {
        const windows = lifecycle();

        if (windows === undefined) throw new Error('Window lifecycle unavailable.');
        await windows.show();
      },
      workArea: (source) => {
        if (source === undefined) return screen.getPrimaryDisplay().workArea;
        // DWM frames are physical; Electron performs monitor-aware conversion, including negative origins.
        const dip = screen.screenToDipRect(null, source);

        return screen.getDisplayMatching(dip).workArea;
      },
      schedule: (callback, milliseconds) => {
        const timer = setTimeout(callback, milliseconds);

        return () => {
          clearTimeout(timer);
        };
      },
      failed: () => {
        console.error('Unable to show capture confirmation.');
      }
    },
    preferences()
  );
  let closing = false;
  const unsubscribe = capture.subscribe((event) => {
    service.updatePreferences(preferences());
    void service.capture(event);
  });
  const changed = () => {
    try {
      service.displayChanged();
    } catch {
      console.error('Unable to reposition capture confirmation.');
    }
  };

  screen.on('display-added', changed);
  screen.on('display-removed', changed);
  screen.on('display-metrics-changed', changed);
  return {
    refreshPreferences: () => {
      if (closing) return;
      // Storage publishes before SettingsService installs its durable snapshot: queue behind it.
      void settings.services
        .getSettings({})
        .then(() => {
          if (!closing) service.updatePreferences(preferences());
        })
        .catch(() => {
          /* A settings failure keeps the last confirmed preferences. */
        });
    },
    close: () => {
      closing = true;
      unsubscribe();
      screen.removeListener('display-added', changed);
      screen.removeListener('display-removed', changed);
      screen.removeListener('display-metrics-changed', changed);
      return service.close();
    }
  };
}
