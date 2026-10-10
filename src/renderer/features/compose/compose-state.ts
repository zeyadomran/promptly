import type { Attachment } from '../../../shared/contracts/attachments';
import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { WorkflowSaveOutcome } from '../../../shared/contracts/workflow-save';

export type ComposeDestination = 'library' | 'queue';
export type ComposeBridge = Pick<
  DesktopBridge,
  'beginDraft' | 'discardDraft' | 'getQueueItem' | 'saveWorkflowDraft' | 'invalidateCopyDraft'
>;
export interface ComposeDraft {
  id: string;
  revision: number;
  destination: ComposeDestination;
  source: { kind: 'queue'; id: string } | undefined;
  text: string;
  tagIds: string[];
  draftToken: string;
  attachments: Attachment[];
  fromGlobal: boolean;
  initial: string;
}
export interface ComposeState {
  draft: ComposeDraft | undefined;
  pending: boolean;
  assetPending: boolean;
  prompt: boolean;
  error: string | undefined;
  saved: WorkflowSaveOutcome | undefined;
}
export { draftIdentity } from '../attachments/draft-identity';
