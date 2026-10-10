import { z } from 'zod';

import {
  assetBytesSchema,
  assetIdSchema,
  attachmentRequestSchema,
  attachmentSchema,
  attachmentsSchema
} from './attachments';

const coordinate = z.number().min(-4096).max(8192);
const point = z.strictObject({ x: coordinate, y: coordinate });
const base = {
  id: assetIdSchema,
  color: z.string().regex(/^#[a-f0-9]{6}$/iu),
  width: z.number().min(1).max(64)
};
const elements = z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal('stroke'), points: z.array(point).min(2).max(5000) }),
  z.strictObject({ ...base, type: z.enum(['arrow', 'rectangle']), from: point, to: point }),
  z.strictObject({
    ...base,
    type: z.literal('text'),
    at: point,
    text: z.string().min(1).max(10_000),
    fontSize: z.number().min(8).max(128)
  })
]);

export const drawingSceneSchema = z
  .strictObject({
    version: z.literal(1),
    width: z.int().min(1).max(4096),
    height: z.int().min(1).max(4096),
    backgroundAttachmentId: assetIdSchema.optional(),
    elements: z.array(elements).max(500)
  })
  .refine((scene) => new TextEncoder().encode(JSON.stringify(scene)).byteLength <= 1024 * 1024)
  .refine(
    (scene) =>
      scene.elements.reduce(
        (sum, element) => sum + (element.type === 'stroke' ? element.points.length : 2),
        0
      ) <= 50_000
  )
  .refine(
    (scene) => new Set(scene.elements.map((element) => element.id)).size === scene.elements.length
  );
export const drawingOperations = {
  saveDrawing: {
    request: z.strictObject({
      draftToken: assetIdSchema,
      scene: drawingSceneSchema,
      png: assetBytesSchema,
      replaceAttachmentId: assetIdSchema.optional(),
      name: z.string().min(1).max(255).optional()
    }),
    response: z.strictObject({
      token: assetIdSchema,
      attachments: attachmentsSchema,
      attachment: attachmentSchema
    })
  },
  getDrawingScene: {
    request: attachmentRequestSchema,
    response: z.strictObject({ scene: drawingSceneSchema })
  },
  copyDrawingPng: {
    request: z.union([attachmentRequestSchema, z.strictObject({ png: assetBytesSchema })]),
    response: z.strictObject({ status: z.literal('copied') })
  },
  exportDrawingPng: {
    request: z.union([attachmentRequestSchema, z.strictObject({ png: assetBytesSchema })]),
    response: z.discriminatedUnion('status', [
      z.strictObject({ status: z.literal('cancelled') }),
      z.strictObject({ status: z.literal('saved'), filename: z.string().max(255) })
    ])
  }
} as const;
export type DrawingScene = z.infer<typeof drawingSceneSchema>;
