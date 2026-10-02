import { inflateSync } from 'node:zlib';

/** Decode Chromium's 8-bit RGB/RGBA screenshots for actual highlight paint assertions. */
export function pngPixels(png: Buffer) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const color = png[25];

  if (png[24] !== 8 || (color !== 2 && color !== 6)) throw new Error('Unsupported screenshot PNG');
  const channels = color === 2 ? 3 : 4;
  const chunks: Buffer[] = [];
  let offset = 8;

  while (offset < png.length) {
    const size = png.readUInt32BE(offset);

    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT')
      chunks.push(png.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }

  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);

  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)];

    for (let column = 0; column < stride; column += 1) {
      const index = row * stride + column;
      const left = column >= channels ? (pixels[index - channels] ?? 0) : 0;
      const above = row > 0 ? (pixels[index - stride] ?? 0) : 0;
      const diagonal = row > 0 && column >= channels ? (pixels[index - stride - channels] ?? 0) : 0;
      let prediction = 0;

      if (filter === 1) prediction = left;
      else if (filter === 2) prediction = above;
      else if (filter === 3) prediction = Math.floor((left + above) / 2);
      else if (filter === 4) prediction = paeth(left, above, diagonal);
      else if (filter !== 0) throw new Error('Unsupported PNG filter');
      pixels[index] = ((raw[row * (stride + 1) + column + 1] ?? 0) + prediction) % 256;
    }
  }

  return {
    width,
    height,
    at(x: number, y: number): readonly number[] {
      const index = (Math.floor(y) * width + Math.floor(x)) * channels;

      return [pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0];
    }
  };
}

function paeth(left: number, above: number, diagonal: number): number {
  const estimate = left + above - diagonal;
  const a = Math.abs(estimate - left);
  const b = Math.abs(estimate - above);
  const c = Math.abs(estimate - diagonal);

  return a <= b && a <= c ? left : b <= c ? above : diagonal;
}
