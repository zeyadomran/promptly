/** At most one invocation per command; keyboard repeat cannot build an unbounded task queue. */
export class CommandRunner {
  private readonly running = new Set<string>();

  run(name: string, command: () => Promise<void>, onError: () => void): void {
    if (this.running.has(name)) return;
    this.running.add(name);
    void Promise.resolve()
      .then(command)
      .catch(onError)
      .finally(() => {
        this.running.delete(name);
      });
  }
}
