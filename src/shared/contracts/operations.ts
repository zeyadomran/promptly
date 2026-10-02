import { z } from 'zod';

import {
  captureResultSchema,
  idSchema,
  revisionSchema,
  searchPageSchema,
  searchRequestSchema,
  snippetSnapshotSchema,
  snippetTextSchema,
  tagColorSchema,
  tagNameSchema,
  tagSchema,
  tagSummarySchema
} from './domain';
import type { DesktopResult } from './result';
import { settingsPatchSchema, settingsSnapshotSchema } from './settings';
import { shortcutStatusSchema } from './shortcuts';
import {
  sizeModeSchema,
  windowKindSchema,
  windowRecoverySchema,
  windowStateSchema
} from './window';

const emptySchema = z.strictObject({});
const idRequestSchema = z.strictObject({ id: idSchema });
const revisionResponseSchema = z.strictObject({ revision: revisionSchema });
const tagSnapshotSchema = z.strictObject({ revision: revisionSchema, tag: tagSchema });

export const operations = {
  getWindowState: { request: emptySchema, response: windowStateSchema },
  getWindowRecovery: { request: emptySchema, response: windowRecoverySchema },
  returnToMainWindow: { request: emptySchema, response: windowStateSchema },
  setWindowMode: {
    request: z.strictObject({ mode: sizeModeSchema, reducedMotion: z.boolean() }),
    response: windowStateSchema
  },
  setWindowVisibility: {
    request: z.strictObject({ visible: z.boolean() }),
    response: windowStateSchema
  },
  openDesktopWindow: {
    request: z.strictObject({ kind: windowKindSchema }),
    response: windowStateSchema
  },
  quitApplication: { request: emptySchema, response: emptySchema },
  searchSnippets: { request: searchRequestSchema, response: searchPageSchema },
  getSnippet: { request: idRequestSchema, response: snippetSnapshotSchema },
  createSnippet: {
    request: z.strictObject({ text: snippetTextSchema }),
    response: snippetSnapshotSchema
  },
  updateSnippet: {
    request: z.strictObject({ id: idSchema, text: snippetTextSchema }),
    response: snippetSnapshotSchema
  },
  deleteSnippet: {
    request: idRequestSchema,
    response: z.strictObject({ revision: revisionSchema, undoToken: idSchema })
  },
  undoDeleteSnippet: {
    request: z.strictObject({ undoToken: idSchema }),
    response: snippetSnapshotSchema
  },
  duplicateSnippet: { request: idRequestSchema, response: snippetSnapshotSchema },
  copySnippet: {
    request: z.strictObject({ id: idSchema, format: z.enum(['text', 'markdown']) }),
    response: snippetSnapshotSchema
  },
  setSnippetTags: {
    request: z.strictObject({ id: idSchema, tagIds: z.array(idSchema).max(100) }),
    response: snippetSnapshotSchema
  },
  listTags: {
    request: emptySchema,
    response: z.strictObject({ revision: revisionSchema, tags: z.array(tagSummarySchema) })
  },
  createTag: {
    request: z.strictObject({ name: tagNameSchema, color: tagColorSchema.optional() }),
    response: tagSnapshotSchema
  },
  updateTag: {
    request: z.strictObject({ id: idSchema, name: tagNameSchema, color: tagColorSchema }),
    response: tagSnapshotSchema
  },
  deleteTag: { request: idRequestSchema, response: revisionResponseSchema },
  mergeTags: {
    request: z
      .strictObject({ sourceId: idSchema, targetId: idSchema })
      .refine((request) => request.sourceId !== request.targetId),
    response: revisionResponseSchema
  },
  getSettings: { request: emptySchema, response: settingsSnapshotSchema },
  updateSettings: { request: settingsPatchSchema, response: settingsSnapshotSchema },
  getShortcutStatus: { request: emptySchema, response: shortcutStatusSchema },
  setCapturePaused: {
    request: z.strictObject({ paused: z.boolean() }),
    response: shortcutStatusSchema
  },
  setShortcutRecording: {
    request: z.strictObject({ active: z.boolean() }),
    response: shortcutStatusSchema
  },
  captureSelection: { request: emptySchema, response: captureResultSchema }
} as const;

export type OperationName = keyof typeof operations;
export type OperationRequest<K extends OperationName> = z.infer<(typeof operations)[K]['request']>;
export type OperationResponse<K extends OperationName> = z.infer<
  (typeof operations)[K]['response']
>;
export type DesktopOperations = {
  readonly [K in OperationName]: (
    request: OperationRequest<K>
  ) => Promise<DesktopResult<OperationResponse<K>>>;
};
export const changeChannel = 'promptly:changes';
export const subscribeChannel = 'promptly:subscribe';
export const unsubscribeChannel = 'promptly:unsubscribe';

export function operationChannel(name: OperationName): string {
  return `promptly:${name}`;
}
