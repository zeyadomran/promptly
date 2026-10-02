const names = new Set([
  'mainEntered',
  'fixtureEntered',
  'applicationInitialized',
  'uiInitialized',
  'sourceInitialized',
  'shown',
  'loaded',
  'beforeReadiness',
  'readinessWritten',
  'timerStarted',
  'runEntered',
  'runReturned',
  'failed'
]);

/** Decode at most8KiB; accept only fixed stage names and numeric timings/codes. */
export function fixtureStages(elapsed) {
  const stages = [];
  let remaining = 8192;
  let partial = '';

  function read(chunk) {
    if (remaining <= 0 || stages.length >= 32) return;
    const consumed = Math.min(chunk.length, remaining);

    remaining -= consumed;
    partial += chunk.subarray(0, consumed).toString('utf8');
    const lines = partial.split('\n');

    partial = lines.pop();
    for (const line of lines) {
      if (line.length > 256 || stages.length >= 32) continue;
      try {
        const frame = JSON.parse(line);

        if (
          frame === null ||
          typeof frame !== 'object' ||
          Array.isArray(frame) ||
          frame.kind !== 'owned-fixture-stage' ||
          !names.has(frame.stage) ||
          !Number.isFinite(frame.elapsedMs) ||
          frame.elapsedMs < 0 ||
          (frame.hresult !== undefined &&
            (!Number.isInteger(frame.hresult) ||
              frame.hresult < -2147483648 ||
              frame.hresult > 2147483647)) ||
          Object.keys(frame).some((key) => !['kind', 'stage', 'elapsedMs', 'hresult'].includes(key))
        )
          continue;
        stages.push({
          stage: frame.stage,
          elapsedMs: frame.elapsedMs,
          observedMs: elapsed(),
          ...(frame.hresult === undefined ? {} : { hresult: frame.hresult })
        });
      } catch {
        // Private/raw stderr and malformed markers are discarded, never retained.
      }
    }

    if (remaining <= 0 || stages.length >= 32) partial = '';
  }

  return { read, snapshot: () => [...stages] };
}
