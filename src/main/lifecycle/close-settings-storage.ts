interface Closable {
  close: () => Promise<void>;
}

/** Settings may still submit commits during drain; never close SQLite in parallel. */
export async function closeSettingsStorage(settings?: Closable, storage?: Closable): Promise<void> {
  const preferences = await Promise.allSettled([settleClose(settings)]);
  const database = await Promise.allSettled([settleClose(storage)]);
  const errors = [...preferences, ...database].flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : []
  );

  if (errors.length > 0)
    throw new AggregateError(errors, 'Unable to settle preferences and storage.');
}

async function settleClose(resource?: Closable): Promise<void> {
  await resource?.close();
}
