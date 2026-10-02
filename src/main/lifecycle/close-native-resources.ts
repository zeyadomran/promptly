interface NativeResource {
  close: () => Promise<void>;
}

export async function closeNativeResources(
  resources: readonly (NativeResource | undefined)[]
): Promise<void> {
  const results = await Promise.allSettled(
    resources.map((resource) => Promise.resolve().then(() => resource?.close()))
  );
  const errors = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : []
  );

  if (errors.length > 0) throw new AggregateError(errors, 'Unable to close native resources.');
}
