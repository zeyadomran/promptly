import { expect, it } from 'vitest';

import type { BundleSelectionResponse } from '../../../shared/contracts/bundle-selection';
import type { DesktopResult } from '../../../shared/contracts/result';
import { BundleMatchController } from './bundle-match-controller';

it('discards old selected/filter replies and retires pending hidden-count updates', async () => {
  const releases = new Map<string, (result: DesktopResult<BundleSelectionResponse>) => void>();
  const matches: string[][] = [];
  const controller = new BundleMatchController(
    {
      matchBundleSelection: (input) =>
        new Promise((resolve) => {
          releases.set(input.query, resolve);
        })
    },
    (ids) => {
      matches.push([...ids]);
    }
  );
  const request = { ids: ['owned'], query: 'first', tagIds: [], untagged: false };
  const first = controller.refresh(request);
  const second = controller.refresh({ ...request, query: 'second' });

  releases.get('second')?.({ ok: true, value: { revision: 2, ids: [] } });
  await second;
  releases.get('first')?.({ ok: true, value: { revision: 1, ids: ['owned'] } });
  await first;
  expect(matches).toEqual([[]]);
  expect(controller.snapshot()).toMatchObject({ pending: false, error: undefined });
  const retired = controller.refresh({ ...request, query: 'retired' });

  controller.retire();
  releases.get('retired')?.({ ok: true, value: { revision: 3, ids: ['owned'] } });
  await retired;
  expect(matches).toEqual([[]]);
});
