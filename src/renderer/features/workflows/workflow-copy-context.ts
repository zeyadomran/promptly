import { createContext, useContext } from 'react';

import type { BundleModel } from '../bundles/bundle-model';
import type { BundleState } from '../bundles/bundle-state';
import type { WorkflowCopyInput, WorkflowCopyOptions } from './workflow-copy-types';

export interface WorkflowCopyContextValue {
  requestCopy(source: WorkflowCopyInput, options?: WorkflowCopyOptions): Promise<void>;
  startBundle(): void;
  cancelBundle(): void;
  bundle: BundleModel;
  bundleState: BundleState;
  busy: boolean;
  error: string | undefined;
  returnLabel: string | undefined;
  clearError(): void;
}
export const WorkflowCopyContext = createContext<WorkflowCopyContextValue | undefined>(undefined);
export function useWorkflowCopy(): WorkflowCopyContextValue {
  const workflow = useContext(WorkflowCopyContext);

  if (workflow === undefined) throw new Error('Workflow copy provider is missing.');
  return workflow;
}
