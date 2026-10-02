import type { IpcMain, WebContents } from 'electron';

import type { ChangeEvent } from '../../shared/contracts/domain';
import { changeEventSchema, revisionSchema } from '../../shared/contracts/domain';
import type { DesktopOperations, OperationName } from '../../shared/contracts/operations';
import {
  changeChannel,
  operationChannel,
  operations,
  subscribeChannel,
  unsubscribeChannel
} from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { type SettingsSnapshot, settingsSnapshotSchema } from '../../shared/contracts/settings';
import { settingsBootstrapChannel } from '../../shared/settings-bootstrap';
import { dispatchOperation } from './dispatch-operation';
import { WindowRegistry } from './window-registry';

export function installDesktopIpc(
  ipc: IpcMain,
  services: Partial<DesktopOperations> = {},
  initialRevision = 0,
  bootstrap?: () => SettingsSnapshot,
  ownedServices?: (sender: WebContents) => Partial<DesktopOperations>
) {
  const windows = new WindowRegistry();
  const names = Object.keys(operations) as OperationName[];
  let revision = revisionSchema.parse(initialRevision);

  if (bootstrap !== undefined)
    ipc.on(settingsBootstrapChannel, (event, request: unknown) => {
      event.returnValue = !windows.isAuthorized(event)
        ? failure('UNAUTHORIZED', 'This frame cannot receive initial preferences.')
        : !operations.getSettings.request.safeParse(request).success
          ? failure('INVALID_REQUEST', 'Invalid bootstrap request.')
          : { ok: true, value: settingsSnapshotSchema.parse(bootstrap()) };
    });

  for (const name of names) {
    ipc.handle(operationChannel(name), (event, request: unknown) =>
      dispatchOperation(
        { ...services, ...ownedServices?.(event.sender) },
        windows.isAuthorized(event),
        name,
        request,
        { senderId: event.sender.id }
      )
    );
  }

  ipc.handle(subscribeChannel, (event, request: unknown) => {
    if (!operations.listTags.request.safeParse(request).success)
      return failure('INVALID_REQUEST', 'Invalid subscription.');
    if (!windows.subscribe(event)) return failure('UNAUTHORIZED', 'This window cannot subscribe.');
    return { ok: true, value: { revision } };
  });
  ipc.handle(unsubscribeChannel, (event, request: unknown) => {
    if (!operations.listTags.request.safeParse(request).success)
      return failure('INVALID_REQUEST', 'Invalid subscription.');
    if (!windows.isAuthorized(event))
      return failure('UNAUTHORIZED', 'This window cannot unsubscribe.');
    windows.unsubscribe(event);
    return { ok: true, value: { revision } };
  });

  return {
    windows,
    publish(event: ChangeEvent): void {
      const change = changeEventSchema.parse(event);

      if (change.revision <= revision) throw new Error('Change revisions must increase.');
      revision = change.revision;
      windows.broadcast(changeChannel, change);
    },
    dispose(): void {
      ipc.removeAllListeners(settingsBootstrapChannel);
      for (const name of names) ipc.removeHandler(operationChannel(name));
      ipc.removeHandler(subscribeChannel);
      ipc.removeHandler(unsubscribeChannel);
    }
  };
}
