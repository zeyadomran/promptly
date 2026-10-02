import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { StorageClient } from '../storage/client';

/** An ID indexes retained main-process authority, never persisted display metadata. */
export interface SnippetSourceResolver {
  available(id: string): boolean;
  activate(id: string): ReturnType<DesktopOperations['openSnippetSource']>;
}

/** Capture13 must associate a live, main-owned native capability before enabling activation. */
export function snippetSourceServices(
  storage: Pick<StorageClient, 'call'>,
  sources?: SnippetSourceResolver
): Pick<DesktopOperations, 'getSnippetSource' | 'openSnippetSource'> {
  return {
    getSnippetSource: async ({ id }) => {
      const result = await storage.call('getSnippet', { id });

      if (!result.ok) return result;
      const available = sources?.available(id) ?? false;

      return {
        ok: true,
        value: {
          available,
          explanation: available
            ? ''
            : result.value.snippet.sourceApp === null
              ? 'This snippet has no source application.'
              : 'The saved source cannot be verified in this session.'
        }
      };
    },
    openSnippetSource: async ({ id }) => {
      const result = await storage.call('getSnippet', { id });

      if (!result.ok) return result;
      // Display names and persisted app IDs are not activation authority.
      if (sources?.available(id) !== true)
        return failure('UNAVAILABLE', 'The saved source cannot be verified in this session.');
      return sources.activate(id);
    }
  };
}
