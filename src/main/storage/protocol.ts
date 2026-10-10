import { importPreviewSchema } from '../../shared/contracts/backup/operations';
import {
  exportDataSchema,
  exportFileSchema,
  importFileSchema
} from '../../shared/contracts/backup/worker';
import type { ChangeEvent } from '../../shared/contracts/domain';
import {
  captureResultSchema,
  revisionSnapshotSchema,
  snippetSnapshotSchema
} from '../../shared/contracts/domain';
import { operations } from '../../shared/contracts/operations';
import type { DesktopResult } from '../../shared/contracts/result';
import { captureInputSchema } from '../../shared/contracts/storage';
import type { StorageStartupCause } from './startup-failure';

export const storageOperations = {
  getSettings: operations.getSettings,
  updateSettings: operations.updateSettings,
  searchSnippets: operations.searchSnippets,
  matchBundleSelection: operations.matchBundleSelection,
  getSnippet: operations.getSnippet,
  createSnippet: operations.createSnippet,
  updateSnippet: operations.updateSnippet,
  duplicateSnippet: operations.duplicateSnippet,
  deleteSnippet: operations.deleteSnippet,
  undoDeleteSnippet: operations.undoDeleteSnippet,
  setSnippetTags: operations.setSnippetTags,
  setTagMembership: operations.setTagMembership,
  ensureTag: operations.ensureTag,
  listTags: operations.listTags,
  createTag: operations.createTag,
  updateTag: operations.updateTag,
  deleteTag: operations.deleteTag,
  captureSnippet: { request: captureInputSchema, response: captureResultSchema },
  recordSuccessfulCopy: { request: operations.getSnippet.request, response: snippetSnapshotSchema },
  clearLibrary: { request: operations.listTags.request, response: revisionSnapshotSchema },
  exportLibraryData: {
    request: exportFileSchema,
    response: exportDataSchema
  },
  prepareLibraryImport: {
    request: importFileSchema,
    response: importPreviewSchema
  },
  commitLibraryImport: operations.confirmLibraryImport,
  discardLibraryImport: {
    request: operations.cancelLibraryImport.request,
    response: operations.cancelLibraryImport.response
  },
  getRevision: { request: operations.listTags.request, response: revisionSnapshotSchema }
} as const;

export type StorageOperation = keyof typeof storageOperations;
export type StorageRequest<K extends StorageOperation> = ReturnType<
  (typeof storageOperations)[K]['request']['parse']
>;
export type StorageResponse<K extends StorageOperation> = ReturnType<
  (typeof storageOperations)[K]['response']['parse']
>;
export type StorageHandlers = {
  [K in StorageOperation]: (input: StorageRequest<K>) => StorageResponse<K>;
};
export interface WorkerRequest {
  id: number;
  operation: StorageOperation | 'close';
  input: unknown;
}
export interface WorkerReply {
  id: number;
  result: DesktopResult<unknown>;
  change?: ChangeEvent;
  startupFailure?: StorageStartupCause;
}
