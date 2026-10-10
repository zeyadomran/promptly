export function attachmentName(name: string) {
  const characters = Array.from(
    name
      .split(/[\\/]/u)
      .at(-1)
      ?.replace(/[\p{Cc}\p{Cf}]/gu, '') ?? 'Attachment'
  );

  return characters.length <= 120
    ? characters.join('')
    : `${characters.slice(0, 79).join('')}…${characters.slice(-40).join('')}`;
}

export function attachmentSize(bytes: number) {
  return bytes < 1024
    ? `${String(bytes)} B`
    : bytes < 1024 * 1024
      ? `${String(Math.ceil(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
