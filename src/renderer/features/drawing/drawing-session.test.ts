import { expect, it } from 'vitest';

import type { Attachment } from '../../../shared/contracts/attachments';
import type { OperationResponse } from '../../../shared/contracts/operations';
import type { DesktopResult } from '../../../shared/contracts/result';
import { DrawingSession } from './drawing-session';
import {
  drawingTestFixture,
  drawingToken,
  encodedFixture,
  imageAttachment
} from './drawing-test-fixture';

it('keeps a bounded editable canvas through tools, history, unsaved PNG output, failed save and staged scene reopen', async () => {
  const fixture = drawingTestFixture(),
    warnings: string[] = [];
  const session = new DrawingSession(
    fixture.bridge,
    () => Promise.resolve(encodedFixture),
    (message) => {
      warnings.push(message);
    }
  );
  let staged: Attachment[] = [];

  await session.open({
    draftToken: drawingToken,
    attachments: [],
    onSaved: (attachments) => {
      staged = attachments;
    }
  });
  expect(session.snapshot().scene).toMatchObject({ width: 1280, height: 800, elements: [] });
  expect(await session.output('copy')).toBe(false);
  session.commands.setTool('arrow');
  expect(session.commands.addAt({ x: 200, y: 100 })).toBe(true);
  expect(session.snapshot().scene?.elements[0]).toMatchObject({
    type: 'arrow',
    from: { x: 200, y: 100 }
  });
  session.commands.move(10, -1);
  expect(session.snapshot().scene?.elements[0]).toMatchObject({ from: { x: 210, y: 99 } });
  session.commands.setColor('#4e80ed');
  expect(session.snapshot().scene?.elements[0]?.color).toBe('#4e80ed');
  session.commands.undo();
  expect(session.snapshot().scene?.elements[0]?.color).toBe('#18181b');
  session.commands.redo();
  session.commands.setTool('rectangle');
  session.commands.addAt({ x: 400, y: 200 });
  session.commands.setTool('pen');
  session.commands.addAt({ x: 500, y: 100 });
  session.commands.setTool('text');
  session.commands.addAt({ x: 600, y: 300 });
  expect(session.commands.commitText('Label')).toBe(true);
  expect(session.snapshot().scene?.elements.map((item) => item.type)).toEqual([
    'arrow',
    'rectangle',
    'stroke',
    'text'
  ]);
  session.commands.cycle(-1);
  session.commands.delete();
  session.commands.undo();
  expect(session.snapshot().scene?.elements).toHaveLength(4);
  session.requestClose();
  expect(session.snapshot().confirm).toBe(true);
  session.keep();
  expect(await session.output('copy')).toBe(true);
  expect(await session.output('export')).toBe(true);
  expect(fixture.state.clipboard).toEqual(encodedFixture);
  expect(fixture.state.exported).toEqual(encodedFixture);
  expect(staged).toEqual([]);
  expect(session.snapshot()).toMatchObject({ isOpen: true, dirty: true });
  expect(await session.output('save')).toBe(false);
  expect(session.snapshot()).toMatchObject({
    isOpen: true,
    dirty: true,
    pending: undefined,
    error: 'Could not save the drawing. Your drawing is kept.'
  });
  fixture.state.allowSave = true;
  expect(await session.output('save')).toBe(true);
  expect(staged).toHaveLength(2);
  expect(session.snapshot().isOpen).toBe(false);

  await session.open({
    draftToken: drawingToken,
    attachments: [imageAttachment],
    attachmentId: imageAttachment.id,
    onSaved: (attachments) => {
      staged = attachments;
    }
  });
  expect(session.snapshot().scene).toMatchObject({
    width: 64,
    height: 32,
    backgroundAttachmentId: imageAttachment.id,
    elements: []
  });
  session.commands.addAt({ x: 5, y: 5 });
  await session.output('save');
  const drawing = fixture.state.attachment;

  if (drawing === undefined) throw new Error('Missing drawing');
  await session.open({
    draftToken: drawingToken,
    attachments: staged,
    attachmentId: drawing.id,
    onSaved: () => undefined
  });
  expect(session.snapshot()).toMatchObject({
    dirty: false,
    scene: { width: 64, height: 32, backgroundAttachmentId: imageAttachment.id }
  });
  session.commands.move(1, 1);
  await session.output('save');
  expect(fixture.state.saved?.replaceAttachmentId).toBe(drawing.id);
  expect(fixture.state.saved?.scene.backgroundAttachmentId).toBe(imageAttachment.id);
  session.retire();
  await session.open({
    draftToken: drawingToken,
    attachments: [],
    onSaved: () => {
      throw new Error('View failed');
    }
  });
  session.commands.addAt({ x: 200, y: 100 });
  expect(await session.output('save')).toBe(true);
  expect(session.snapshot().isOpen).toBe(false);
  expect(warnings).toContain('Drawing saved. Reopen the editor to refresh attachments.');
  session.close();
  session.start();
  await session.open({ draftToken: drawingToken, attachments: [], onSaved: () => undefined });
  session.commands.addAt({ x: 20, y: 10 });
  const beforeLimit = session.snapshot().scene;

  expect(
    session.commands.add({
      id: crypto.randomUUID(),
      type: 'stroke',
      color: '#18181b',
      width: 4,
      points: Array.from({ length: 5001 }, () => ({ x: 1, y: 2 }))
    })
  ).toBe(false);
  expect(session.snapshot().scene).toBe(beforeLimit);
  session.retire();
  expect(session.snapshot()).toMatchObject({ isOpen: false, scene: undefined });
  let deliverImage:
    ((result: DesktopResult<OperationResponse<'getAttachmentImage'>>) => void) | undefined;

  fixture.state.image = new Promise((resolve) => {
    deliverImage = resolve;
  });
  const oldOpen = session.open({
    draftToken: drawingToken,
    attachments: [imageAttachment],
    attachmentId: imageAttachment.id,
    onSaved: () => undefined
  });

  session.close();
  session.start();
  await session.open({ draftToken: drawingToken, attachments: [], onSaved: () => undefined });
  deliverImage?.({
    ok: true,
    value: { png: new Uint8Array(encodedFixture), width: 64, height: 32 }
  });
  await oldOpen;
  expect(session.snapshot().scene).toMatchObject({ width: 1280, height: 800, elements: [] });
  let deliverSave: ((result: DesktopResult<OperationResponse<'saveDrawing'>>) => void) | undefined;
  const enteredSave = new Promise<void>((resolve) => {
    fixture.state.onSave = resolve;
  });

  fixture.state.saveReply = new Promise((resolve) => {
    deliverSave = resolve;
  });
  session.commands.addAt({ x: 20, y: 10 });
  const saving = session.output('save');

  await enteredSave;
  session.retire();
  const confirmedAttachment = fixture.state.attachment;

  if (confirmedAttachment === undefined) throw new Error('Missing staged result');
  deliverSave?.({
    ok: true,
    value: {
      token: drawingToken,
      attachment: confirmedAttachment,
      attachments: [confirmedAttachment]
    }
  });
  expect(await saving).toBe(true);
  expect(session.snapshot().isOpen).toBe(false);
  session.close();
});
