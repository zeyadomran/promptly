import { z } from 'zod';

const modifiers = new Map([
  ['command', 'command'],
  ['cmd', 'command'],
  ['control', 'control'],
  ['ctrl', 'control'],
  ['commandorcontrol', 'commandorcontrol'],
  ['cmdorctrl', 'commandorcontrol'],
  ['alt', 'alt'],
  ['option', 'alt'],
  ['altgr', 'altgr'],
  ['shift', 'shift'],
  ['super', 'super'],
  ['meta', 'super']
]);
const keyNames = new Set(
  'plus space tab capslock numlock scrolllock backspace delete insert return enter up down left right home end pageup pagedown escape esc volumeup volumedown volumemute medianexttrack mediaprevioustrack mediastop mediaplaypause printscreen numdec numadd numsub nummult numdiv'.split(
    ' '
  )
);

/** Syntactic validation only. Native registration/conflict detection belongs to P07. */
export const acceleratorSchema = z
  .string()
  .min(1)
  .max(128)
  .refine((value) => {
    const parts = value.toLowerCase().split('+');
    const key = parts.pop();
    const normalized = parts.map((modifier) => modifiers.get(modifier));

    return (
      key !== undefined &&
      parts.length > 0 &&
      normalized.every((modifier) => modifier !== undefined) &&
      new Set(normalized).size === normalized.length &&
      (keyNames.has(key) ||
        /^[a-z0-9]$/.test(key) ||
        /^f(?:[1-9]|1[0-9]|2[0-4])$/.test(key) ||
        /^num[0-9]$/.test(key) ||
        (key.length === 1 && ')!@#$%^&*(:;=<>,_-.?/~`{}[]|\\"'.includes(key)))
    );
  });
