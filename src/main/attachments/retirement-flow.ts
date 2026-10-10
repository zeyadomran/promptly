import assert from 'node:assert/strict';

import type { DesktopResult } from '../../shared/contracts/result';
import type { StorageClient } from '../storage/client';
import { LibraryMutations } from '../storage/library-mutations';
import type { StorageResponse } from '../storage/protocol';
import type { AssetEffects } from './ports';
import { AttachmentService } from './service';

export async function retirePendingDraft(
  storage: Pick<StorageClient, 'call'>,
  effects: AssetEffects
): Promise<void> {
  let entered: (() => void) | undefined, release: (() => void) | undefined;
  const admission = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  let token: string | undefined;
  const delayed: Pick<StorageClient, 'call'> = {
    call: async (name, input) => {
      const result = await storage.call(name, input);

      if (name === 'beginAssetDraft') {
        const draft = result as DesktopResult<StorageResponse<'beginAssetDraft'>>;

        if (draft.ok) token = draft.value.token;
        entered?.();
        await response;
      }

      return result;
    }
  };
  const service = new AttachmentService(delayed, new LibraryMutations(), effects);
  const begin = service.begin({}, { senderId: 7 });

  await admission;
  const closing = service.close();

  release?.();
  assert.partialDeepStrictEqual(await begin, { ok: false, error: { code: 'UNAUTHORIZED' } });
  await closing;
  if (token === undefined) throw new Error('Draft was not admitted');
  assert.partialDeepStrictEqual(await storage.call('getAssetDraft', { draftToken: token }), {
    ok: false,
    error: { code: 'NOT_FOUND' }
  });
}
