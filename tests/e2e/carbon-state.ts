import { z } from 'zod';

import { probeChordSchema } from './probe-chord';

const counter = z.number().int().min(0).max(1024);

export const carbonStateSchema = z.strictObject({
  chord: probeChordSchema,
  phase: z.enum(['ready', 'final']),
  pid: z.number().int().min(1).max(2147483647),
  foregroundMatched: z.boolean(),
  handlerStatus: z.number().int(),
  registrationStatus: z.number().int(),
  listening: z.boolean(),
  tapInstalled: z.boolean(),
  carbonPressed: counter,
  handlerEntered: counter,
  parameterFailed: counter,
  idMismatch: counter,
  localDown: counter,
  localUp: counter,
  localF11Character: z.boolean(),
  localKCharacter: z.boolean(),
  localFunction: z.boolean(),
  localNumericPad: z.boolean(),
  localMonitorInstalled: z.boolean(),
  localMonitorRemoved: z.boolean(),
  sessionDown: counter,
  sessionUp: counter,
  tapDisabled: counter,
  elapsedMs: z.number().nonnegative()
});

export function decodeCarbonState(text: string) {
  try {
    const parsed = carbonStateSchema.safeParse(JSON.parse(text));

    if (parsed.success) return parsed.data;
  } catch {
    // Never repeat invalid receipt contents in logs.
  }

  throw new Error('Invalid owned Carbon receipt');
}
