import { z } from 'zod';

export const probeChords = ['ctrl-option-f11', 'ctrl-option-k'] as const;
export const probeChordSchema = z.enum(probeChords);
export type ProbeChord = z.infer<typeof probeChordSchema>;

export function parseProbeChord(value: unknown): ProbeChord {
  const result = probeChordSchema.safeParse(value);

  if (!result.success) throw new Error('Invalid owned probe chord');
  return result.data;
}

export function probeDriverAction(value: ProbeChord): 'pin' | 'carbon-letter-k' {
  return parseProbeChord(value) === 'ctrl-option-f11' ? 'pin' : 'carbon-letter-k';
}
