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
import { updateSubscription } from './update-subscription';

export interface BridgeTransport {
  invoke(channel: string, request: unknown): Promise<unknown>;
  listen(listener: (value: unknown) => void): () => void;
  listenFocus?: (listener: () => void) => () => void;
  listenUpdates?: (listener: (value: unknown) => void) => () => void;
}

export function createDesktopBridge(
  transport: BridgeTransport,
  platform: DesktopBridge['platform']
) {
  const listeners = new Set<(event: ChangeEvent) => void>();
  let stopListening: (() => void) | undefined;
  let generation = 0;
  let disposed = false;
  const focusStops = new Set<() => void>();

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
    getUpdateState: (request) => call('getUpdateState', request),
    checkForUpdates: (request) => call('checkForUpdates', request),
    installUpdate: (request) => call('installUpdate', request),
    restartForUpdate: (request) => call('restartForUpdate', request),
    subscribeUpdates: updateSubscription(transport.listenUpdates, focusStops, () => disposed),
    getApplicationInfo: (request) => call('getApplicationInfo', request),
    openRepository: (request) => call('openRepository', request),
    openWiki: (request) => call('openWiki', request),
    openWikiPageEditor: (request) => call('openWikiPageEditor', request),
    openWikiResource: (request) => call('openWikiResource', request),
    openPrivacyPolicy: (request) => call('openPrivacyPolicy', request),
    getOnboardingState: (request) => call('getOnboardingState', request),
    setOnboardingStep: (request) => call('setOnboardingStep', request),
    finishOnboarding: (request) => call('finishOnboarding', request),
    getStorageLocation: (request) => call('getStorageLocation', request),
    revealStorageLocation: (request) => call('revealStorageLocation', request),
    exportLibrary: (request) => call('exportLibrary', request),
    previewLibraryImport: (request) => call('previewLibraryImport', request),
    confirmLibraryImport: (request) => call('confirmLibraryImport', request),
    cancelLibraryImport: (request) => call('cancelLibraryImport', request),
    clearLibrary: (request) => call('clearLibrary', request),
    getWindowState: (request) => call('getWindowState', request),
    getWindowRecovery: (request) => call('getWindowRecovery', request),
    returnToMainWindow: (request) => call('returnToMainWindow', request),
    setWindowMode: (request) => call('setWindowMode', request),
    setWindowVisibility: (request) => call('setWindowVisibility', request),
    openDesktopWindow: (request) => call('openDesktopWindow', request),
    quitApplication: (request) => call('quitApplication', request),
    searchSnippets: (request) => call('searchSnippets', request),
    getSnippet: (request) => call('getSnippet', request),
    getSnippetSource: (request) => call('getSnippetSource', request),
    openSnippetSource: (request) => call('openSnippetSource', request),
    createSnippet: (request) => call('createSnippet', request),
    updateSnippet: (request) => call('updateSnippet', request),
    deleteSnippet: (request) => call('deleteSnippet', request),
    undoDeleteSnippet: (request) => call('undoDeleteSnippet', request),
    duplicateSnippet: (request) => call('duplicateSnippet', request),
    copySnippet: (request) => call('copySnippet', request),
    setSnippetTags: (request) => call('setSnippetTags', request),
    setTagMembership: (request) => call('setTagMembership', request),
    ensureTag: (request) => call('ensureTag', request),
    listTags: (request) => call('listTags', request),
    createTag: (request) => call('createTag', request),
    updateTag: (request) => call('updateTag', request),
    deleteTag: (request) => call('deleteTag', request),
    mergeTags: (request) => call('mergeTags', request),
    getSettings: (request) => call('getSettings', request),
    getLoginStatus: (request) => call('getLoginStatus', request),
    updateSettings: (request) => call('updateSettings', request),
    getShortcutStatus: (request) => call('getShortcutStatus', request),
    retryShortcuts: (request) => call('retryShortcuts', request),
    setCapturePaused: (request) => call('setCapturePaused', request),
    setShortcutRecording: (request) => call('setShortcutRecording', request),
    captureSelection: (request) => call('captureSelection', request),
    subscribeWindowFocus(listener) {
      if (disposed || transport.listenFocus === undefined) return () => undefined;
      const stopFocus = transport.listenFocus(listener);
      const unsubscribe = () => {
        stopFocus();
        focusStops.delete(unsubscribe);
      };

      focusStops.add(unsubscribe);
      return unsubscribe;
    },
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
      for (const stopFocus of focusStops) stopFocus();
      listeners.clear();
      stop();
    }
  };
}
