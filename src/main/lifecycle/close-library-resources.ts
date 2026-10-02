interface LibraryResources {
  close: () => Promise<void>;
}

/** Stop transfer/capture acceptance and drain library writes while storage is still alive. */
export async function closeLibraryResources(
  library: readonly (LibraryResources | undefined)[],
  remaining: () => Promise<void>
) {
  const transfer = await Promise.allSettled(
    library.map((resource) => Promise.resolve().then(() => resource?.close()))
  );
  const resources = await Promise.allSettled([Promise.resolve().then(remaining)]);
  const failures = [...transfer, ...resources].flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : []
  );

  if (failures.length > 0)
    throw new AggregateError(failures, 'Unable to settle library resources.');
}
