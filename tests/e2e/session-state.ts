import { z } from 'zod';

import { probeChordSchema } from './probe-chord';

const count = z.number().int().min(0).max(1024);
const sessionStateSchema = z.strictObject({
  chord: probeChordSchema,
  phase: z.enum(['ready', 'inspect', 'final']),
  pid: z.number().int().min(1).max(2147483647),
  listening: z.boolean(),
  tapInstalled: z.boolean(),
  enabled: z.boolean(),
  secureInput: z.boolean(),
  down: count,
  up: count,
  disabled: count,
  elapsedMs: z.number().nonnegative()
});

export type SessionState = z.infer<typeof sessionStateSchema>;

export function decodeSessionState(text: string): SessionState {
  try {
    const result = sessionStateSchema.safeParse(JSON.parse(text));

    if (result.success) return result.data;
  } catch {
    /* Never reproduce invalid receipt contents. */
  }

  throw new Error('Invalid owned session sidecar receipt');
}

/** Unavailable observation is inconclusive and never authorizes probe input. */
export function sessionObservationAvailable(state: SessionState): boolean {
  return (
    state.listening &&
    state.tapInstalled &&
    state.enabled &&
    !state.secureInput &&
    state.disabled === 0
  );
}
