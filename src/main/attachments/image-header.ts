import { assetLimits } from '../../shared/contracts/attachments';

/** Inspect dimensions before handing compressed bytes to an allocating native decoder. */
export function imageHeader(bytes: Uint8Array): { width: number; height: number } | undefined {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer.length >= 10 && /^GIF8[79]a$/u.test(buffer.toString('ascii', 0, 6)))
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  if (buffer.length >= 26 && buffer.toString('ascii', 0, 2) === 'BM')
    return { width: Math.abs(buffer.readInt32LE(18)), height: Math.abs(buffer.readInt32LE(22)) };
  if (
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    if (buffer.toString('ascii', 12, 16) === 'VP8X')
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (
      buffer.toString('ascii', 12, 16) === 'VP8 ' &&
      buffer[23] === 157 &&
      buffer[24] === 1 &&
      buffer[25] === 42
    )
      return { width: buffer.readUInt16LE(26) % 16384, height: buffer.readUInt16LE(28) % 16384 };
    if (buffer.toString('ascii', 12, 16) === 'VP8L' && buffer[20] === 47) {
      const bits = buffer.readUInt32LE(21);

      return { width: 1 + (bits % 16384), height: 1 + (Math.floor(bits / 16384) % 16384) };
    }
  }

  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216) {
    let offset = 2;

    while (offset + 4 <= buffer.length) {
      if (buffer[offset] !== 255) return undefined;
      while (buffer[offset] === 255) offset++;
      const marker = buffer[offset++];

      if (marker === 217 || marker === 218) return undefined;
      if (
        marker === 216 ||
        marker === 1 ||
        (marker !== undefined && marker >= 208 && marker <= 215)
      )
        continue;
      if (offset + 2 > buffer.length) return undefined;
      const length = buffer.readUInt16BE(offset);

      if (length < 2 || offset + length > buffer.length) return undefined;
      if (
        marker !== undefined &&
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) &&
        length >= 7
      )
        return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
      offset += length;
    }
  }

  return undefined;
}

export function previewable(
  dimensions: ReturnType<typeof imageHeader>
): dimensions is { width: number; height: number } {
  return (
    dimensions !== undefined &&
    dimensions.width > 0 &&
    dimensions.height > 0 &&
    Math.max(dimensions.width, dimensions.height) <= assetLimits.imageEdge &&
    dimensions.width * dimensions.height <= assetLimits.imagePixels
  );
}

export function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  );
}
