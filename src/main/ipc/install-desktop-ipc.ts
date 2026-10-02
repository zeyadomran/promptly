import type { IpcMain } from 'electron';

import type { ChangeEvent } from '../../shared/contracts/domain';
import { changeEventSchema } from '../../shared/contracts/domain';
import type { DesktopOperations, OperationName } from '../../shared/contracts/operations';
import {
  changeChannel,
  operationChannel,
  operations,
  subscribeChannel,
  unsubscribeChannel
} from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { dispatchOperation } from './dispatch-operation';
import { WindowRegistry } from './window-registry';

export function installDesktopIpc(ipc: IpcMain, services: Partial<DesktopOperations> = {}) {
  const windows = new WindowRegistry();
  const names = Object.keys(operations) as OperationName[];
  let revision = 0;

  for (const name of names) {
    ipc.handle(operationChannel(name), (event, request: unknown) =>
      dispatchOperation(services, windows.isAuthorized(event), name, request)
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
      for (const name of names) ipc.removeHandler(operationChannel(name));
      ipc.removeHandler(subscribeChannel);
      ipc.removeHandler(unsubscribeChannel);
    }
  };
}
