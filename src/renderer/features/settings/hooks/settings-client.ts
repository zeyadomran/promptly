import type { DesktopBridge } from '../../../../shared/contracts/desktop-bridge';
import type { DesktopError } from '../../../../shared/contracts/result';
import type { SettingsSnapshot } from '../../../../shared/contracts/settings';

/** Invalidation subscriber, never an authoritative preference store. */
export function createSettingsClient(
  bridge: Pick<DesktopBridge, 'getSettings' | 'subscribeChanges'>,
  onSnapshot: (snapshot: SettingsSnapshot) => void,
  onError: (error: DesktopError) => void,
  initial?: SettingsSnapshot
) {
  let disposed = false;
  let revision = initial?.revision ?? -1;
  let wanted = revision;
  let request = 0;

  async function refresh(retry = true): Promise<void> {
    const generation = ++request;
    const result = await bridge.getSettings({});

    if (disposed || generation !== request) return;
    if (!result.ok) {
      onError(result.error);
      return;
    }

    if (result.value.revision < wanted) {
      if (retry) await refresh(false);
      else onError({ code: 'UNAVAILABLE', message: 'Preferences changed. Please try again.' });
      return;
    }

    if (result.value.revision < revision) return;
    revision = result.value.revision;
    onSnapshot(result.value);
  }

  const stop = bridge.subscribeChanges((event) => {
    if (!event.domains.includes('settings') || event.revision <= wanted) return;
    wanted = event.revision;
    void refresh();
  });

  void refresh();
  return () => {
    if (disposed) return;
    disposed = true;
    request++;
    stop();
  };
}
