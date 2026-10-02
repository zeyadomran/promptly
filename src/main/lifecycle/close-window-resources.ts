interface WindowResources {
  close: () => Promise<void>;
}

/** Geometry may submit settings writes; complete that drain before closing preference storage. */
export async function closeWindowResources(
  window: WindowResources | undefined,
  closeRemaining: () => Promise<void>
): Promise<void> {
  const geometry = await Promise.allSettled([Promise.resolve().then(() => window?.close())]);
  const remaining = await Promise.allSettled([Promise.resolve().then(closeRemaining)]);
  const errors = [...geometry, ...remaining].flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : []
  );

  if (errors.length > 0) throw new AggregateError(errors, 'Unable to settle desktop resources.');
}
