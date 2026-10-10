import type { Attachment } from '../../../shared/contracts/attachments';
import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { DrawingScene } from '../../../shared/contracts/drawing';

export type DrawingElement = DrawingScene['elements'][number];
export interface DrawingPoint {
  x: number;
  y: number;
}
export type DrawingTool = 'select' | 'pen' | 'arrow' | 'rectangle' | 'text';
export interface DrawingOpenOptions {
  draftToken: string;
  attachmentId?: string;
  attachments: Attachment[];
  saveTarget?: 'prompt' | 'snippet';
  onSaved(attachments: Attachment[]): void;
}
export type DrawingBridge = Pick<
  DesktopBridge,
  'getAttachmentImage' | 'getDrawingScene' | 'saveDrawing' | 'copyDrawingPng' | 'exportDrawingPng'
>;
export interface DrawingRaster {
  png: Uint8Array;
  width: number;
  height: number;
}
export type DrawingEncoder = (
  scene: DrawingScene,
  background?: DrawingRaster
) => Promise<Uint8Array>;
