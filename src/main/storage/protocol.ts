import type { ChangeEvent } from '../../shared/contracts/domain';
import {
  captureResultSchema,
  revisionSnapshotSchema,
  snippetSnapshotSchema
} from '../../shared/contracts/domain';
import { operations } from '../../shared/contracts/operations';
import type { DesktopResult } from '../../shared/contracts/result';
import { captureInputSchema } from '../../shared/contracts/storage';
import type { WorkerTimings } from './worker-diagnostics';

export const storageOperations = {
  getSettings: operations.getSettings,
  updateSettings: operations.updateSettings,
  searchSnippets: operations.searchSnippets,
  getSnippet: operations.getSnippet,
  createSnippet: operations.createSnippet,
  updateSnippet: operations.updateSnippet,
  duplicateSnippet: operations.duplicateSnippet,
  deleteSnippet: operations.deleteSnippet,
  undoDeleteSnippet: operations.undoDeleteSnippet,
  setSnippetTags: operations.setSnippetTags,
  listTags: operations.listTags,
  createTag: operations.createTag,
  updateTag: operations.updateTag,
  deleteTag: operations.deleteTag,
  mergeTags: operations.mergeTags,
  captureSnippet: { request: captureInputSchema, response: captureResultSchema },
  recordSuccessfulCopy: { request: operations.getSnippet.request, response: snippetSnapshotSchema },
  clearLibrary: { request: operations.listTags.request, response: revisionSnapshotSchema },
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
  diagnostic?: true;
}
export interface WorkerReply {
  id: number;
  result: DesktopResult<unknown>;
  change?: ChangeEvent;
  diagnostic?: WorkerTimings;
}
