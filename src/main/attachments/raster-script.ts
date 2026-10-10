export interface RasterInput {
  base64: string;
  width: number;
  height: number;
  edge: number;
  maxBytes: number;
}

/** Fixed code runs only in the main-owned, unregistered sandbox decoder. No product renderer receives originals. */
export async function rasterInSandbox(input: RasterInput) {
  const binary = atob(input.base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const image = await createImageBitmap(new Blob([bytes]));

  try {
    if (!(
      (image.width === input.width && image.height === input.height) ||
      (image.width === input.height && image.height === input.width)
    ))
      throw new Error('Image header mismatch');
    let edge = input.edge;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (context === null) throw new Error('Image canvas unavailable');
    for (;;) {
      const scale = Math.min(1, edge / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale)),
        height = Math.max(1, Math.round(image.height * scale));

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value === null) reject(new Error('PNG encoding failed'));
          else resolve(value);
        }, 'image/png');
      });

      if (blob.size <= input.maxBytes) {
        const png = new Uint8Array(await blob.arrayBuffer());
        const parts: string[] = [];

        for (let offset = 0; offset < png.byteLength; offset += 8192)
          parts.push(String.fromCharCode(...png.subarray(offset, offset + 8192)));
        return { base64: btoa(parts.join('')), width, height };
      }

      if (edge <= 128) throw new Error('Unable to produce bounded PNG');
      edge = Math.floor(edge / 2);
    }
  } finally {
    image.close();
  }
}
