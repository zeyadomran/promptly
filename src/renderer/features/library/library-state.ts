import type { SearchRequest, TagSummary } from '../../../shared/contracts/domain';
import type { DesktopError } from '../../../shared/contracts/result';
import { initialQuery, PageCache } from './page-cache';

export interface LibraryState {
  request: SearchRequest;
  total: number;
  unfilteredTotal: number;
  tags: TagSummary[];
  selectedId: string | null;
  selectedIndex: number;
  revealVersion: number;
  loading: boolean;
  error: DesktopError | undefined;
  cache: PageCache;
  version: number;
}

export function initialLibraryState(): LibraryState {
  return {
    request: initialQuery,
    total: 0,
    unfilteredTotal: 0,
    tags: [],
    selectedId: null,
    selectedIndex: -1,
    revealVersion: 0,
    loading: true,
    error: undefined,
    cache: new PageCache(),
    version: 0
  };
}
