import type {
  DesktopOperations,
  OperationName,
  OperationRequest,
  OperationResponse
} from '../shared/contracts/operations';
import type { DesktopResult } from '../shared/contracts/result';

export type OperationCaller = <K extends OperationName>(
  name: K,
  input: OperationRequest<K>
) => Promise<DesktopResult<OperationResponse<K>>>;

/** Explicit frozen bridge methods retain the validated operation allowlist. */
export function desktopOperationMethods(call: OperationCaller): DesktopOperations {
  return {
    getUpdateState: (request) => call('getUpdateState', request),
    checkForUpdates: (request) => call('checkForUpdates', request),
    installUpdate: (request) => call('installUpdate', request),
    restartForUpdate: (request) => call('restartForUpdate', request),
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
    matchBundleSelection: (request) => call('matchBundleSelection', request),
    getSnippet: (request) => call('getSnippet', request),
    getSnippetSource: (request) => call('getSnippetSource', request),
    openSnippetSource: (request) => call('openSnippetSource', request),
    createSnippet: (request) => call('createSnippet', request),
    updateSnippet: (request) => call('updateSnippet', request),
    deleteSnippet: (request) => call('deleteSnippet', request),
    undoDeleteSnippet: (request) => call('undoDeleteSnippet', request),
    duplicateSnippet: (request) => call('duplicateSnippet', request),
    copySnippet: (request) => call('copySnippet', request),
    getPreviousApp: (request) => call('getPreviousApp', request),
    returnToPreviousApp: (request) => call('returnToPreviousApp', request),
    setSnippetTags: (request) => call('setSnippetTags', request),
    setTagMembership: (request) => call('setTagMembership', request),
    ensureTag: (request) => call('ensureTag', request),
    listTags: (request) => call('listTags', request),
    createTag: (request) => call('createTag', request),
    updateTag: (request) => call('updateTag', request),
    deleteTag: (request) => call('deleteTag', request),
    getSettings: (request) => call('getSettings', request),
    getLoginStatus: (request) => call('getLoginStatus', request),
    updateSettings: (request) => call('updateSettings', request),
    getShortcutStatus: (request) => call('getShortcutStatus', request),
    retryShortcuts: (request) => call('retryShortcuts', request),
    setCapturePaused: (request) => call('setCapturePaused', request),
    setShortcutRecording: (request) => call('setShortcutRecording', request),
    captureSelection: (request) => call('captureSelection', request),
    prepareCopy: (request) => call('prepareCopy', request),
    commitCopy: (request) => call('commitCopy', request),
    cancelPreparedCopy: (request) => call('cancelPreparedCopy', request),
    invalidateCopyDraft: (request) => call('invalidateCopyDraft', request)
  };
}
