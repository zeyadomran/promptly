import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import type { DesktopResult } from '../../shared/contracts/result';
import { workflowFixture } from './workflow-test-fixture';

function rejected(result: DesktopResult<unknown>, code: string): void {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
}

/** Canonical draft-copy phases; no independently collected duplicate cases. */
export async function draftCopyFlow() {
  const fixture = workflowFixture();

  try {
    const draftId = randomUUID();
    const source = {
      kind: 'draft' as const,
      draftId,
      draftRevision: 1,
      text: '{{blank}}',
      attachmentCount: 2
    };
    const prepared = await fixture.service.services.prepareCopy({ source }, { senderId: 1 });

    if (!prepared.ok) throw new Error(prepared.error.message);
    assert.equal(prepared.value.attachmentCount, 2);
    const commit = {
      token: prepared.value.token,
      values: { blank: { value: '', leaveBlank: true } },
      format: 'text' as const,
      mode: 'resolved' as const,
      return: false,
      draftRevision: 1
    };

    fixture.rejectClipboard(true);
    rejected(await fixture.service.services.commitCopy(commit, { senderId: 1 }), 'UNAVAILABLE');
    fixture.rejectClipboard(false);
    const copied = await fixture.service.services.commitCopy(commit, { senderId: 1 });

    assert.equal(copied.ok, true);
    assert.deepEqual(copied.value.sourceIds, []);
    assert.equal(copied.value.attachmentCount, 2);

    assert.deepEqual(fixture.clipboard, ['']);
    const changed = await fixture.service.services.prepareCopy({ source }, { senderId: 1 });

    if (!changed.ok) throw new Error(changed.error.message);
    const stale = { ...commit, token: changed.value.token };

    rejected(
      await fixture.service.services.commitCopy({ ...stale, draftRevision: 2 }, { senderId: 1 }),
      'CONFLICT'
    );
    assert.equal(
      (
        await fixture.service.services.invalidateCopyDraft(
          { draftId, draftRevision: 2 },
          { senderId: 1 }
        )
      ).ok,
      true
    );
    rejected(await fixture.service.services.commitCopy(stale, { senderId: 1 }), 'CONFLICT');
    rejected(await fixture.service.services.commitCopy(stale, { senderId: 2 }), 'UNAUTHORIZED');
    assert.equal(
      (
        await fixture.service.services.cancelPreparedCopy(
          { token: changed.value.token },
          { senderId: 1 }
        )
      ).ok,
      true
    );
    rejected(
      await fixture.service.services.commitCopy(stale, { senderId: 1 }),
      'PREPARATION_EXPIRED'
    );
    const expired = await fixture.service.services.prepareCopy({ source }, { senderId: 1 });

    if (!expired.ok) throw new Error(expired.error.message);
    fixture.tick();
    rejected(
      await fixture.service.services.commitCopy(
        { ...commit, token: expired.value.token },
        { senderId: 1 }
      ),
      'PREPARATION_EXPIRED'
    );
    const cleared = await fixture.service.services.prepareCopy({ source }, { senderId: 1 });

    if (!cleared.ok) throw new Error(cleared.error.message);
    fixture.service.retirePreparations();
    rejected(
      await fixture.service.services.commitCopy(
        { ...commit, token: cleared.value.token },
        { senderId: 1 }
      ),
      'PREPARATION_EXPIRED'
    );
    const lost = await fixture.service.services.prepareCopy({ source }, { senderId: 1 });

    if (!lost.ok) throw new Error(lost.error.message);
    fixture.retire();
    rejected(
      await fixture.service.services.commitCopy(
        { ...commit, token: lost.value.token },
        { senderId: 1 }
      ),
      'UNAUTHORIZED'
    );
    assert.equal(
      fixture.store.invoke('searchSnippets', {
        query: '',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 200
      }).total,
      0
    );
  } finally {
    await fixture.dispose();
  }

  let release: (value: boolean) => void = () => undefined;
  let admitted: () => void = () => undefined;
  const held = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    admitted = resolve;
  });
  let delayed = true;
  const late = workflowFixture(() => {
    admitted();
    return delayed ? held : true;
  });

  try {
    const source = {
      kind: 'draft' as const,
      draftId: randomUUID(),
      draftRevision: 1,
      text: 'literal',
      attachmentCount: 0
    };
    const preparing = late.service.services.prepareCopy({ source }, { senderId: 1 });

    await ready;
    late.service.retirePreparations();
    release(true);
    rejected(await preparing, 'PREPARATION_EXPIRED');
    delayed = false;
    const fresh = await late.service.services.prepareCopy({ source }, { senderId: 1 });

    assert.equal(fresh.ok, true);
  } finally {
    await late.dispose();
  }
}
