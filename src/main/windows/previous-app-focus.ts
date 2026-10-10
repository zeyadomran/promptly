import type { BrowserWindow } from 'electron';

import { previousAppChangedChannel } from '../../shared/contracts/previous-app';
import type { PreviousAppService } from '../previous-app/service';

export type PreviousAppCapture = Pick<
  PreviousAppService,
  'captureBeforeShow' | 'captureAfterFocus'
>;

/** Start capture before publishing; this notification never moves renderer input focus. */
export function watchPreviousAppFocus(
  window: BrowserWindow,
  previous: Pick<PreviousAppService, 'captureAfterFocus'> | undefined,
  closing: () => boolean,
  onError: (error: unknown) => void
): void {
  const focused = () => {
    if (closing()) return;
    const capture = previous?.captureAfterFocus() ?? Promise.resolve();

    void capture
      .then(() => {
        if (!closing() && !window.isDestroyed() && window.isFocused())
          window.webContents.send(previousAppChangedChannel);
      })
      .catch(onError);
  };

  window.on('focus', focused);
  window.once('closed', () => {
    window.off('focus', focused);
  });
}
