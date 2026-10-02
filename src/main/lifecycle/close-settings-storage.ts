interface Closable {
  close: () => Promise<void>;
}

/** Keep storage/native controllers available until accepted settings effects settle. */
export async function closeSettingsStorage(
  settings?: Closable,
  storage?: Closable,
  native?: Closable,
  controllers?: Closable
): Promise<void> {
  const preferences = await Promise.allSettled([settleClose(settings)]);
  const effects = await Promise.allSettled([settleClose(controllers)]);
  const database = await Promise.allSettled([settleClose(storage), settleClose(native)]);
  const errors = [...preferences, ...effects, ...database].flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : []
  );

  if (errors.length > 0)
    throw new AggregateError(errors, 'Unable to settle preferences and desktop resources.');
}

async function settleClose(resource?: Closable): Promise<void> {
  await resource?.close();
}
