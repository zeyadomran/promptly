/** Setup errors retain their original cause and safe cleanup outcomes, never raw source data. */
export class OwnedFixtureSetupError extends AggregateError {
  readonly cleanupOutcomes: readonly ('fulfilled' | 'rejected')[];

  constructor(original: unknown, cleanup: readonly PromiseSettledResult<unknown>[]) {
    super(
      [
        original,
        ...cleanup.flatMap((result): unknown[] => {
          if (result.status !== 'rejected') return [];
          const reason: unknown = result.reason;

          return [reason];
        })
      ],
      'Owned fixture setup failed',
      { cause: original }
    );
    this.cleanupOutcomes = [
      ...(original instanceof OwnedFixtureSetupError ? original.cleanupOutcomes : []),
      ...cleanup.map((result) => result.status)
    ];
  }
}
