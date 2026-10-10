import type { Attachment } from '../../../shared/contracts/attachments';
import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { Snippet } from '../../../shared/contracts/domain';

export type SnippetEditBridge = Pick<DesktopBridge, 'getSnippet' | 'updateSnippet'> &
  Partial<Pick<DesktopBridge, 'beginDraft' | 'discardDraft' | 'invalidateCopyDraft'>>;

export interface SnippetSessionState {
  snippet: Snippet | null;
  draft: string;
  draftId: string;
  draftRevision: number;
  draftToken: string | undefined;
  draftTags: string[];
  draftAttachments: Attachment[];
  editing: boolean;
  loading: boolean;
  pending: boolean;
  assetPending: boolean;
  prompt: boolean;
  missing: boolean;
  conflict: boolean;
  error: string | undefined;
}

export function initialSnippetSession(): SnippetSessionState {
  return {
    snippet: null,
    draft: '',
    draftId: '',
    draftRevision: 0,
    draftToken: undefined,
    draftTags: [],
    draftAttachments: [],
    editing: false,
    loading: false,
    pending: false,
    assetPending: false,
    prompt: false,
    missing: false,
    conflict: false,
    error: undefined
  };
}
