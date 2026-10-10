import type { DesktopResult } from '../../shared/contracts/result';
import type { SavedCopySource, WorkflowCopyOutcome } from '../../shared/contracts/workflow-copy';
import type { TransferOwner } from '../storage/transfer/requests';

export interface WorkflowContent extends SavedCopySource {
  text: string;
  tags: readonly { id: string; name: string; color: string }[];
  attachments: readonly {
    id: string;
    sha256: string;
    name?: string;
    kind?: string;
    mimeType?: string;
    byteLength?: number;
    width?: number | null;
    height?: number | null;
    hasScene?: boolean;
  }[];
}
export interface PreparedCopyExecution {
  text: string;
  sourceIds: readonly SavedCopySource[];
  format: 'text' | 'markdown';
  return: boolean;
  attachmentCount: number;
}
export type PreparedCopyResolver = (
  signal: AbortSignal
) => Promise<DesktopResult<PreparedCopyExecution>>;
export interface WorkflowCopyPorts {
  owner: (id: number) => TransferOwner | undefined;
  lookup: (source: SavedCopySource) => Promise<DesktopResult<WorkflowContent>>;
  variablesEnabled: () => boolean | Promise<boolean>;
  executePrepared: (
    context: { senderId: number },
    resolve: PreparedCopyResolver
  ) => Promise<DesktopResult<WorkflowCopyOutcome>>;
  now?: () => number;
}
