import type { DesktopError } from '../../../shared/contracts/result';
import type {
  PreparedCopy,
  VariableAnswers,
  WorkflowCopyOutcome,
  WorkflowCopySource
} from '../../../shared/contracts/workflow-copy';

export interface FillState {
  active: boolean;
  source: WorkflowCopySource | null;
  prepared: PreparedCopy | null;
  values: VariableAnswers;
  format: 'text' | 'markdown';
  preview: string;
  previewValid: boolean;
  outcome: WorkflowCopyOutcome | null;
  unresolved: string[];
  loading: boolean;
  pending: boolean;
  error: string | undefined;
  errorCode: DesktopError['code'] | undefined;
  focusName: string | undefined;
}
export const emptyFillState = (): FillState => ({
  active: false,
  source: null,
  prepared: null,
  values: {},
  format: 'text',
  preview: '',
  previewValid: true,
  outcome: null,
  unresolved: [],
  loading: false,
  pending: false,
  error: undefined,
  errorCode: undefined,
  focusName: undefined
});
