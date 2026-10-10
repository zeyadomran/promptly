import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { QueueItem, QueuePreview } from '../../../shared/contracts/queue';
import type { WorkflowCopyOutcome } from '../../../shared/contracts/workflow-copy';

export type QueueBridge = Pick<
  DesktopBridge,
  | 'listQueue'
  | 'getQueueItem'
  | 'subscribeChanges'
  | 'reorderQueueItems'
  | 'setQueueItemCompleted'
  | 'undoQueueCompletion'
  | 'deleteQueueItem'
  | 'undoDeleteQueueItem'
  | 'saveQueueItemToLibrary'
>;
export type QueueToast =
  | { kind: 'completion' | 'delete'; id: string; undoToken: string; message: string }
  | { kind: 'copied'; id: string; outcome: WorkflowCopyOutcome }
  | { kind: 'saved'; id: string; snippetId: string }
  | { kind: 'reopened'; id: string };
export interface QueueState {
  items: QueuePreview[];
  openCount: number;
  revision: number;
  selectedId: string | null;
  tab: 'open' | 'done';
  detail: QueueItem | null;
  loading: boolean;
  detailLoading: boolean;
  pending: boolean;
  error: string | undefined;
  toast: QueueToast | undefined;
  announcement: string;
  revealVersion: number;
}
export const initialQueueState = (): QueueState => ({
  items: [],
  openCount: 0,
  revision: 0,
  selectedId: null,
  tab: 'open',
  detail: null,
  loading: true,
  detailLoading: false,
  pending: false,
  error: undefined,
  toast: undefined,
  announcement: '',
  revealVersion: 0
});
export function queueItems(state: QueueState): QueuePreview[] {
  return state.items.filter((item) => (item.completedAt === null) === (state.tab === 'open'));
}
