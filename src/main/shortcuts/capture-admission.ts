/** A capability for one trigger, invalidated by suppression transitions even if later resumed. */
export class CaptureAdmission {
  private generation = 0;

  constructor(private readonly allowed: () => boolean) {}

  begin(): (() => boolean) | undefined {
    if (!this.allowed()) return undefined;
    const generation = this.generation;

    return () => generation === this.generation && this.allowed();
  }

  invalidate(): void {
    this.generation++;
  }
}
