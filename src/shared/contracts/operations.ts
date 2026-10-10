import { z } from 'zod';

import { transferOperations } from './backup/operations';
import { bundleSelectionOperations } from './bundle-selection';
import { copyOutcomeSchema } from './copy';
import {
  captureResultSchema,
  idSchema,
  revisionSchema,
  searchPageSchema,
  searchRequestSchema,
  snippetSnapshotSchema,
  snippetTextSchema,
  tagColorSchema,
  tagInputNameSchema,
  tagSchema,
  tagSummarySchema
} from './domain';
import { loginStatusSchema } from './login-status';
import {
  onboardingDestinationSchema,
  onboardingStateSchema,
  onboardingStepSchema
} from './onboarding';
import { previousAppOperations } from './previous-app';
import type { DesktopResult } from './result';
import { settingsPatchSchema, settingsSnapshotSchema } from './settings';
import { shortcutStatusSchema } from './shortcuts';
import { snippetSourceSchema } from './snippet-source';
import { updateOperations } from './updates';
import { wikiPageIdSchema, wikiResourceSchema } from './wiki';
import {
  sizeModeSchema,
  windowKindSchema,
  windowRecoverySchema,
  windowStateSchema
} from './window';
import { workflowCopyOperations } from './workflow-copy';

const emptySchema = z.strictObject({});
const idRequestSchema = z.strictObject({ id: idSchema });
const revisionResponseSchema = z.strictObject({ revision: revisionSchema });
const tagSnapshotSchema = z.strictObject({ revision: revisionSchema, tag: tagSchema });

export const operations = {
  ...transferOperations,
  ...updateOperations,
  ...previousAppOperations,
  ...workflowCopyOperations,
  ...bundleSelectionOperations,
  getApplicationInfo: {
    request: emptySchema,
    response: z.strictObject({ version: z.string().min(1).max(128) })
  },
  openRepository: { request: emptySchema, response: emptySchema },
  openWiki: { request: emptySchema, response: emptySchema },
  openWikiPageEditor: {
    request: z.strictObject({ page: wikiPageIdSchema }),
    response: emptySchema
  },
  openWikiResource: {
    request: z.strictObject({ resource: wikiResourceSchema }),
    response: emptySchema
  },
  openPrivacyPolicy: { request: emptySchema, response: emptySchema },
  getOnboardingState: { request: emptySchema, response: onboardingStateSchema },
  setOnboardingStep: {
    request: z.strictObject({ step: onboardingStepSchema }),
    response: onboardingStateSchema
  },
  finishOnboarding: {
    request: z.strictObject({
      skip: z.boolean(),
      destination: onboardingDestinationSchema.optional()
    }),
    response: onboardingStateSchema
  },
  getWindowState: { request: emptySchema, response: windowStateSchema },
  getWindowRecovery: { request: emptySchema, response: windowRecoverySchema },
  returnToMainWindow: { request: emptySchema, response: windowStateSchema },
  setWindowMode: {
    request: z.strictObject({ mode: sizeModeSchema }),
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
  getSnippetSource: { request: idRequestSchema, response: snippetSourceSchema },
  openSnippetSource: { request: idRequestSchema, response: emptySchema },
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
    response: copyOutcomeSchema
  },
  setSnippetTags: {
    request: z.strictObject({ id: idSchema, tagIds: z.array(idSchema).max(100) }),
    response: snippetSnapshotSchema
  },
  setTagMembership: {
    request: z.strictObject({ id: idSchema, tagId: idSchema, assigned: z.boolean() }),
    response: snippetSnapshotSchema
  },
  ensureTag: {
    request: z.strictObject({ name: tagInputNameSchema, snippetId: idSchema.optional() }),
    response: tagSnapshotSchema
  },
  listTags: {
    request: emptySchema,
    response: z.strictObject({ revision: revisionSchema, tags: z.array(tagSummarySchema) })
  },
  createTag: {
    request: z.strictObject({ name: tagInputNameSchema, color: tagColorSchema.optional() }),
    response: tagSnapshotSchema
  },
  updateTag: {
    request: z.strictObject({ id: idSchema, name: tagInputNameSchema, color: tagColorSchema }),
    response: tagSnapshotSchema
  },
  deleteTag: { request: idRequestSchema, response: revisionResponseSchema },
  getSettings: { request: emptySchema, response: settingsSnapshotSchema },
  getLoginStatus: { request: emptySchema, response: loginStatusSchema },
  updateSettings: { request: settingsPatchSchema, response: settingsSnapshotSchema },
  getShortcutStatus: { request: emptySchema, response: shortcutStatusSchema },
  retryShortcuts: { request: emptySchema, response: shortcutStatusSchema },
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
    request: OperationRequest<K>,
    context?: { senderId: number }
  ) => Promise<DesktopResult<OperationResponse<K>>>;
};
export const changeChannel = 'promptly:changes';
export const subscribeChannel = 'promptly:subscribe';
export const unsubscribeChannel = 'promptly:unsubscribe';

export function operationChannel(name: OperationName): string {
  return `promptly:${name}`;
}
