import { expect, it } from 'vitest';

import { failure } from '../../../shared/contracts/result';
import type { PreparedCopy, WorkflowCopyOperations } from '../../../shared/contracts/workflow-copy';
import { FillModel } from '../variables/fill-model';
import { BundleModel } from './bundle-model';

const first = '00000000-0000-4000-8000-000000000001';
const second = '00000000-0000-4000-8000-000000000002';
const token = '00000000-0000-4000-8000-000000000003';

it('keeps explicit bundle order across filters and paging, shares fill answers and discards them on Back', async () => {
  const clipboard: string[] = [];
  let rejected = false;
  let expired = false;
  let missing = false;
  const bridge: WorkflowCopyOperations = {
    prepareCopy: ({ source }) => {
      if (missing && source.kind === 'snippet' && source.id === first)
        return Promise.resolve(
          failure('NOT_FOUND', 'The selected snippet is no longer in the library.')
        );
      const ids =
        source.kind === 'bundle' ? source.ids : source.kind === 'snippet' ? [source.id] : [];
      const prepared: PreparedCopy = {
        token,
        source,
        expiresAt: 300000,
        segments: ids.map((id) => ({
          kind: 'snippet',
          id,
          text: id === first ? 'first {{shared}}' : 'second {{shared}}',
          fingerprint: (id === first ? 'a' : 'b').repeat(64)
        })),
        text:
          ids.length === 1
            ? ids[0] === first
              ? 'first {{shared}}'
              : 'second {{shared}}'
            : 'second {{shared}}\n\nfirst {{shared}}',
        variables: [
          { name: 'shared', count: ids.length, sourceIndexes: ids.map((_id, index) => index + 1) }
        ],
        attachmentCount: 0
      };

      return Promise.resolve({ ok: true, value: prepared });
    },
    cancelPreparedCopy: () => Promise.resolve({ ok: true, value: {} }),
    invalidateCopyDraft: () => Promise.resolve({ ok: true, value: {} }),
    commitCopy: (input) => {
      if (missing)
        return Promise.resolve(
          failure('NOT_FOUND', 'The selected snippet is no longer in the library.')
        );
      if (expired) {
        expired = false;
        return Promise.resolve(failure('PREPARATION_EXPIRED', 'Prepare the text again.'));
      }

      if (rejected) return Promise.resolve(failure('UNAVAILABLE', 'Owned clipboard unavailable'));
      clipboard.push(input.values['shared']?.value ?? '');
      return Promise.resolve({
        ok: true,
        value: {
          status: 'copied',
          sourceIds: [],
          attachmentCount: 0,
          returned: 'not-requested',
          warnings: []
        }
      });
    }
  };
  const bundle = new BundleModel(bridge);

  bundle.start();
  await bundle.toggle(first);
  await bundle.toggle(second);
  bundle.setMatchingIds(new Set([second]));
  expect(bundle.snapshot().hiddenCount).toBe(1);
  bundle.move(second, -1);
  expect(bundle.source().ids).toEqual([second, first]);
  bundle.setMatchingIds(new Set([first, second]));
  expect(bundle.snapshot().hiddenCount).toBe(0);
  expect(clipboard).toEqual([]);
  expect(bundle.review()).toBe(true);
  const fill = new FillModel(bridge);

  await fill.open(bundle.source());
  fill.change('shared', '{{other}}');
  expect(fill.snapshot().preview).toBe('second {{other}}\n\nfirst {{other}}');
  rejected = true;
  expect(await fill.copy()).toBe(false);
  expect(fill.snapshot().values['shared']?.value).toBe('{{other}}');
  rejected = false;
  expired = true;
  expect(await fill.copy()).toBe(false);
  expect(fill.snapshot().prepared).not.toBeNull();
  expect(fill.snapshot().values['shared']?.value).toBe('{{other}}');
  missing = true;
  expect(await fill.copy()).toBe(false);
  expect(fill.snapshot().prepared).toBeNull();
  await bundle.refreshEntries();
  expect(bundle.snapshot().entries.find((entry) => entry.id === first)?.missing).toBe(true);
  expect(bundle.source().ids).toEqual([second, first]);
  expect(fill.snapshot().values['shared']?.value).toBe('{{other}}');
  missing = false;
  await bundle.refreshEntries();
  await fill.refresh(bundle.source());
  expect(fill.snapshot().prepared).not.toBeNull();
  expect(fill.snapshot().values['shared']?.value).toBe('{{other}}');
  fill.cancel();
  bundle.back();
  expect(fill.snapshot().values).toEqual({});
  expect(bundle.source().ids).toEqual([second, first]);
  await fill.open(bundle.source());
  expect(fill.snapshot().unresolved).toEqual(['shared']);
  fill.leaveBlank('shared', true);
  expect(fill.snapshot().preview).toBe('second \n\nfirst ');
  bundle.remove(first);
  expect(bundle.canCopy).toBe(false);
  fill.cancel();
  bundle.cancel();
  expect(bundle.snapshot().entries).toEqual([]);
  expect(clipboard).toEqual([]);
});

it('renews a changed draft preview while retaining only shared variable names and never saving it', async () => {
  let source = {
    kind: 'draft' as const,
    draftId: first,
    draftRevision: 1,
    text: '{{constructor}}',
    attachmentCount: 1
  };
  const clipboard: string[] = [];
  const bridge: WorkflowCopyOperations = {
    prepareCopy: ({ source: requested }) =>
      Promise.resolve({
        ok: true,
        value: {
          token,
          source: requested,
          expiresAt: 300000,
          segments: [{ kind: 'draft', id: first, text: source.text, fingerprint: 'a'.repeat(64) }],
          text: source.text,
          variables:
            source.draftRevision === 1
              ? [{ name: 'constructor', count: 1, sourceIndexes: [1] }]
              : [
                  { name: 'constructor', count: 1, sourceIndexes: [1] },
                  { name: 'extra', count: 1, sourceIndexes: [1] }
                ],
          attachmentCount: 1
        }
      }),
    cancelPreparedCopy: () => Promise.resolve({ ok: true, value: {} }),
    invalidateCopyDraft: () => Promise.resolve({ ok: true, value: {} }),
    commitCopy: (input) => {
      clipboard.push(input.values['constructor']?.value ?? '');
      return Promise.resolve({
        ok: true,
        value: {
          status: 'copied',
          sourceIds: [],
          attachmentCount: 1,
          returned: 'not-requested',
          warnings: []
        }
      });
    }
  };
  const fill = new FillModel(bridge, () => source);

  await fill.open(source);
  fill.change('constructor', 'kept');
  source = { ...source, text: '{{constructor}} {{extra}}', draftRevision: 2 };
  expect(await fill.copy()).toBe(false);
  expect(clipboard).toEqual([]);
  expect(fill.snapshot().values['constructor']?.value).toBe('kept');
  expect(fill.snapshot().preview).toBe('kept {{extra}}');
  fill.leaveBlank('extra', true);
  expect(await fill.copy()).toBe(true);
  expect(source.text).toBe('{{constructor}} {{extra}}');
  expect(fill.snapshot().values).toEqual({});
  expect(clipboard).toEqual(['kept']);
});
