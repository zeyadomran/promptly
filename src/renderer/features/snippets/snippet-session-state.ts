import type { Snippet } from '../../../shared/contracts/domain';

export interface SnippetSessionState {
  snippet: Snippet | null;
  draft: string;
  editing: boolean;
  loading: boolean;
  pending: boolean;
  prompt: boolean;
  missing: boolean;
  conflict: boolean;
  error: string | undefined;
}
