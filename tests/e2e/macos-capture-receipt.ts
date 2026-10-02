interface CaptureObservation {
  status: string;
  elapsedMs?: number | undefined;
}

/** Deliberately project only status/timing; never retain text, ranges or identity tokens. */
export function recordMacosCapture(
  evidence: object[],
  phase: string,
  started: number,
  result: CaptureObservation,
  fields: { mode?: string; sample?: number; ownedPidMatched?: boolean } = {}
) {
  evidence.push({
    phase,
    ...fields,
    status: result.status,
    roundTripMs: performance.now() - started,
    deadlineMs: 100,
    ...(result.status === 'ok' ? { nativeMs: result.elapsedMs } : {})
  });
}
