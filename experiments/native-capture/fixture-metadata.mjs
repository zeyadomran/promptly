export const metadataBytes = 4096;

export function fixtureMetadata(text, expectedPid, requireForeground = false) {
  if (Buffer.byteLength(text, 'utf8') > metadataBytes) throw new Error('metadataTooLarge');
  const value = JSON.parse(text);

  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Number.isInteger(value.fixturePid) ||
    value.fixturePid <= 0 ||
    value.fixturePid > 2147483647 ||
    (expectedPid !== undefined && value.fixturePid !== expectedPid) ||
    (requireForeground && typeof value.foregroundMatched !== 'boolean') ||
    Object.keys(value).some((key) => key !== 'fixturePid' && key !== 'foregroundMatched')
  )
    throw new Error('invalidMetadata');
  return {
    fixturePid: value.fixturePid,
    ...(requireForeground ? { foregroundMatched: value.foregroundMatched } : {})
  };
}
