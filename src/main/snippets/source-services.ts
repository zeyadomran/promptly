import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { StorageClient } from '../storage/client';

/** Capture13 must associate a live, main-owned native capability before enabling activation. */
export function snippetSourceServices(
  storage: Pick<StorageClient, 'call'>
): Pick<DesktopOperations, 'getSnippetSource' | 'openSnippetSource'> {
  return {
    getSnippetSource: async ({ id }) => {
      const result = await storage.call('getSnippet', { id });

      if (!result.ok) return result;
      return {
        ok: true,
        value: {
          available: false,
          explanation:
            result.value.snippet.sourceApp === null
              ? 'This snippet has no source application.'
              : 'The saved source cannot be verified in this session.'
        }
      };
    },
    openSnippetSource: async ({ id }) => {
      const result = await storage.call('getSnippet', { id });

      if (!result.ok) return result;
      // Display names and persisted app IDs are not activation authority.
      return failure('UNAVAILABLE', 'The saved source cannot be verified in this session.');
    }
  };
}
