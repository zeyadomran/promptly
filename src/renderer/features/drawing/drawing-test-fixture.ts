import type { Attachment } from '../../../shared/contracts/attachments';
import type { DrawingScene } from '../../../shared/contracts/drawing';
import type { OperationRequest, OperationResponse } from '../../../shared/contracts/operations';
import type { DesktopResult } from '../../../shared/contracts/result';
import type { DrawingBridge } from './drawing-types';

export const drawingToken = '00000000-0000-4000-8000-000000000007';
export const imageAttachment: Attachment = {
  id: '00000000-0000-4000-8000-000000000009',
  name: 'Original.jpg',
  kind: 'image',
  mimeType: 'image/jpeg',
  byteLength: 1,
  sha256: 'a'.repeat(64),
  width: 32,
  height: 64,
  hasScene: false
};
export const encodedFixture = new Uint8Array([1, 2, 3]);

/** Controlled IPC and browser encoder boundaries; scene/model/history remain real. */
export function drawingTestFixture() {
  const state: {
    allowSave: boolean;
    allowCopy: boolean;
    allowExport: boolean;
    clipboard: Uint8Array | undefined;
    exported: Uint8Array | undefined;
    saved: OperationRequest<'saveDrawing'> | undefined;
    scene: DrawingScene | undefined;
    attachment: Attachment | undefined;
    image: Promise<DesktopResult<OperationResponse<'getAttachmentImage'>>> | undefined;
    saveReply?: Promise<DesktopResult<OperationResponse<'saveDrawing'>>>;
    onSave?: () => void;
  } = {
    allowSave: false,
    allowCopy: true,
    allowExport: true,
    clipboard: undefined,
    exported: undefined,
    saved: undefined,
    scene: undefined,
    attachment: undefined,
    image: undefined
  };
  const unavailable = {
    ok: false as const,
    error: { code: 'UNAVAILABLE' as const, message: 'External operation failed' }
  };
  const bridge: DrawingBridge = {
    getAttachmentImage: () =>
      state.image ??
      Promise.resolve({ ok: true, value: { png: encodedFixture, width: 64, height: 32 } }),
    getDrawingScene: () =>
      Promise.resolve(
        state.scene === undefined ? unavailable : { ok: true, value: { scene: state.scene } }
      ),
    saveDrawing: (input) => {
      if (!state.allowSave) return Promise.resolve(unavailable);
      state.saved = input;
      state.scene = input.scene;
      const attachment: Attachment = {
        ...imageAttachment,
        id: '00000000-0000-4000-8000-000000000008',
        name: input.name ?? 'Drawing 1.png',
        kind: 'drawing',
        mimeType: 'image/png',
        width: input.scene.width,
        height: input.scene.height,
        hasScene: true
      };

      state.attachment = attachment;
      state.onSave?.();
      return (
        state.saveReply ??
        Promise.resolve({
          ok: true,
          value: { token: drawingToken, attachments: [imageAttachment, attachment], attachment }
        })
      );
    },
    copyDrawingPng: (input) => {
      if (!state.allowCopy) return Promise.resolve(unavailable);
      if ('png' in input) state.clipboard = input.png;
      return Promise.resolve({ ok: true, value: { status: 'copied' } });
    },
    exportDrawingPng: (input) => {
      if (!state.allowExport) return Promise.resolve(unavailable);
      if ('png' in input) state.exported = input.png;
      return Promise.resolve({ ok: true, value: { status: 'cancelled' } });
    }
  };

  return { state, bridge };
}
