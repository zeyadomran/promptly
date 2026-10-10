import { imageHeader, previewable } from './image-header';
import type { AssetEffects, AssetIntake } from './ports';

export async function classifyIntake(effects: AssetEffects, files: AssetIntake[]) {
  const inputs = [];

  // Sequential decode bounds compressed/raster allocations across an eight-file intake.
  for (const file of files) {
    let dimensions = imageHeader(file.bytes);

    if (previewable(dimensions)) {
      try {
        await effects.raster(file.bytes, 160);
      } catch {
        dimensions = undefined;
      }
    }

    const image = previewable(dimensions) ? dimensions : null;

    inputs.push({
      name: file.name,
      bytes: new Uint8Array(file.bytes),
      mimeType: file.mimeType,
      kind: image === null ? ('file' as const) : ('image' as const),
      width: image?.width ?? null,
      height: image?.height ?? null
    });
  }

  return inputs;
}
