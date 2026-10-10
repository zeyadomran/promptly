import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type {
  WorkflowCopyOperations,
  WorkflowCopyOutcome,
  WorkflowCopySource
} from '../../../shared/contracts/workflow-copy';

export type WorkflowCopyInput = WorkflowCopySource | (() => WorkflowCopySource | undefined);
export interface WorkflowCopyOptions {
  format?: 'text' | 'markdown' | undefined;
  return?: boolean;
  asWritten?: boolean;
  onCopied?: (outcome: WorkflowCopyOutcome) => void;
}
export type WorkflowCopyBridge = WorkflowCopyOperations &
  Pick<DesktopBridge, 'copySnippet' | 'getPreviousApp'>;
export interface WorkflowCopyState {
  busy: boolean;
  reviewing: boolean;
  error: string | undefined;
  returnLabel: string | undefined;
  feedback: string | undefined;
}
