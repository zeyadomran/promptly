import { expect, it } from 'vitest';

import type { PreparedCopy, WorkflowCopyOutcome } from '../../../shared/contracts/workflow-copy';
import { WorkflowCopyController } from './workflow-copy-controller';
import type { WorkflowCopyBridge } from './workflow-copy-types';

it('keeps plain copy immediate, opens authoritative templates and blocks copy during bundle selection', async () => {
  const clipboard: string[] = [];
  const notifications: WorkflowCopyOutcome[] = [];
  let template = false;
  const prepared: PreparedCopy = {
    token: '00000000-0000-4000-8000-000000000001',
    source: { kind: 'snippet', id: '00000000-0000-4000-8000-000000000002' },
    segments: [],
    text: 'Hello {{name}}',
    variables: [{ name: 'name', count: 1, sourceIndexes: [0] }],
    attachmentCount: 0,
    expiresAt: 300000
  };
  const bridge: WorkflowCopyBridge = {
    copySnippet: ({ id }) => {
      if (template)
        return Promise.resolve({
          ok: false,
          error: { code: 'TEMPLATE_REQUIRES_PREPARATION', message: 'Needs values.' }
        });
      clipboard.push('plain');
      return Promise.resolve({ ok: true, value: { status: 'copied', id, warnings: [] } });
    },
    prepareCopy: () => Promise.resolve({ ok: true, value: prepared }),
    commitCopy: ({ values }) => {
      clipboard.push(`Hello ${values['name']?.value ?? ''}`);
      return Promise.resolve({
        ok: true,
        value: {
          status: 'copied',
          sourceIds: [
            { kind: 'snippet', id: prepared.source.kind === 'snippet' ? prepared.source.id : '' }
          ],
          attachmentCount: 0,
          returned: 'not-requested',
          warnings: []
        }
      });
    },
    cancelPreparedCopy: () => Promise.resolve({ ok: true, value: {} }),
    invalidateCopyDraft: () => Promise.resolve({ ok: true, value: {} }),
    getPreviousApp: () => Promise.resolve({ ok: true, value: { state: 'none' } })
  };
  const controller = new WorkflowCopyController(bridge);

  try {
    controller.close();
    controller.start(); // The React StrictMode setup/cleanup/setup lifetime.
    await controller.requestCopy(prepared.source, {
      onCopied: (outcome) => {
        notifications.push(outcome);
        throw new Error('Controlled success view failure');
      }
    });
    expect(clipboard).toEqual(['plain']);
    expect(notifications).toHaveLength(1);
    template = true;
    await controller.requestCopy(prepared.source, {
      onCopied: (outcome) => notifications.push(outcome)
    });
    expect(controller.snapshot().reviewing).toBe(true);
    expect(clipboard).toEqual(['plain']);
    controller.fill.change('name', 'Ada');
    expect(await controller.fill.copy()).toBe(true);
    expect(clipboard).toEqual(['plain', 'Hello Ada']);
    expect(notifications).toHaveLength(2);
    template = false;
    await controller.requestCopy(prepared.source, {
      onCopied: () => {
        throw new Error('Controlled view failure');
      }
    });
    expect(controller.snapshot().feedback).toBe('Copied.');
    expect(controller.snapshot().error).toBeUndefined();
    template = true;
    prepared.text = '{{name}}'.repeat(2_049);
    await controller.requestCopy(prepared.source);
    controller.fill.change('name', 'a'.repeat(100_000));
    expect(controller.fill.snapshot().previewValid).toBe(false);
    expect(controller.fill.snapshot().values['name']?.value).toHaveLength(100_000);
    expect(await controller.fill.copy()).toBe(false);
    controller.fill.cancel();
    controller.startBundle();
    await controller.requestCopy(prepared.source);
    expect(clipboard).toEqual(['plain', 'Hello Ada', 'plain']);
    expect(controller.bundle.snapshot().active).toBe(true);
    controller.cancelBundle();
    await controller.requestCopy(prepared.source, { return: true });
    expect(controller.snapshot().error).toContain('return');
    expect(clipboard).toEqual(['plain', 'Hello Ada', 'plain']);
  } finally {
    controller.close();
  }
});
