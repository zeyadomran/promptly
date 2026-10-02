/** All services settle before errors can release the application's quit gate. */
export async function closeDesktopServices(
  cleanups: readonly (() => Promise<void>)[]
): Promise<void> {
  const outcomes = await Promise.allSettled(
    cleanups.map((cleanup) => Promise.resolve().then(cleanup))
  );
  const failures = outcomes
    .filter((outcome) => outcome.status === 'rejected')
    .map((outcome) => outcome.reason as unknown);

  if (failures.length !== 0) throw new AggregateError(failures, 'Desktop service cleanup failed.');
}
