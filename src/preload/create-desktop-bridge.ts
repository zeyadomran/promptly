import type { DesktopBridge } from '../shared/contracts/desktop-bridge';
import type { ChangeEvent } from '../shared/contracts/domain';
import { changeEventSchema, revisionSnapshotSchema } from '../shared/contracts/domain';
import type {
  OperationName,
  OperationRequest,
  OperationResponse
} from '../shared/contracts/operations';
import {
  operationChannel,
  operations,
  subscribeChannel,
  unsubscribeChannel
} from '../shared/contracts/operations';
import type { DesktopResult } from '../shared/contracts/result';
import { failure, resultSchema } from '../shared/contracts/result';

export interface BridgeTransport {
  invoke(channel: string, request: unknown): Promise<unknown>;
  listen(listener: (value: unknown) => void): () => void;
}

export function createDesktopBridge(
  transport: BridgeTransport,
  platform: DesktopBridge['platform']
) {
  const listeners = new Set<(event: ChangeEvent) => void>();
  let stopListening: (() => void) | undefined;
  let generation = 0;
  let disposed = false;

  async function call<K extends OperationName>(
    name: K,
    input: OperationRequest<K>
  ): Promise<DesktopResult<OperationResponse<K>>> {
    if (disposed) return failure('UNAVAILABLE', 'The desktop bridge is closed.');
    const operation = operations[name];
    const request = operation.request.safeParse(input);

    if (!request.success) return failure('INVALID_REQUEST', 'The desktop request is malformed.');
    try {
      const reply = await transport.invoke(operationChannel(name), request.data);
      const result = resultSchema<unknown>(operation.response).safeParse(reply);

      return result.success
        ? (result.data as DesktopResult<OperationResponse<K>>)
        : failure('INTERNAL', 'Invalid desktop response.');
    } catch {
      return failure('UNAVAILABLE', 'The desktop connection is unavailable.');
    }
  }

  function emit(value: unknown): void {
    const event = changeEventSchema.safeParse(value);

    if (!event.success) return;
    for (const listener of listeners) {
      try {
        listener(event.data);
      } catch {
        /* One consumer cannot interrupt other subscribers. */
      }
    }
  }

  function stop(): void {
    generation += 1;
    stopListening?.();
    stopListening = undefined;
    void transport.invoke(unsubscribeChannel, {}).catch(() => undefined);
  }

  const bridge = Object.freeze<DesktopBridge>({
    platform,
    searchSnippets: (request) => call('searchSnippets', request),
    getSnippet: (request) => call('getSnippet', request),
    createSnippet: (request) => call('createSnippet', request),
    updateSnippet: (request) => call('updateSnippet', request),
    deleteSnippet: (request) => call('deleteSnippet', request),
    undoDeleteSnippet: (request) => call('undoDeleteSnippet', request),
    duplicateSnippet: (request) => call('duplicateSnippet', request),
    copySnippet: (request) => call('copySnippet', request),
    setSnippetTags: (request) => call('setSnippetTags', request),
    listTags: (request) => call('listTags', request),
    createTag: (request) => call('createTag', request),
    updateTag: (request) => call('updateTag', request),
    deleteTag: (request) => call('deleteTag', request),
    mergeTags: (request) => call('mergeTags', request),
    getSettings: (request) => call('getSettings', request),
    updateSettings: (request) => call('updateSettings', request),
    getMacosPermissions: (request) => call('getMacosPermissions', request),
    openMacosPermissionSettings: (request) => call('openMacosPermissionSettings', request),
    captureSelection: (request) => call('captureSelection', request),
    subscribeChanges(listener) {
      if (disposed) return () => undefined;
      // Ownership belongs to this registration, even when callbacks are identical.
      const registeredListener = (event: ChangeEvent): void => {
        listener(event);
      };

      listeners.add(registeredListener);
      if (stopListening === undefined) {
        stopListening = transport.listen(emit);
        const current = ++generation;

        void transport
          .invoke(subscribeChannel, {})
          .then((reply: unknown) => {
            if (current !== generation) return;
            // Handshake invalidates snapshots read before a listener was registered.
            const result = resultSchema(revisionSnapshotSchema).safeParse(reply);

            if (result.success && result.data.ok)
              emit({
                revision: result.data.value.revision,
                domains: ['snippets', 'tags', 'settings']
              });
          })
          .catch(() => undefined);
      }

      let active = true;

      return () => {
        if (!active) return;
        active = false;
        listeners.delete(registeredListener);
        if (listeners.size === 0) stop();
      };
    }
  });

  return {
    bridge,
    dispose: (): void => {
      disposed = true;
      listeners.clear();
      stop();
    }
  };
}
