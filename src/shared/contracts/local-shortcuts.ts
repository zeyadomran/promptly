import { z } from 'zod';

import { acceleratorSchema } from './accelerator';

/** Local commands may use a single key; Tab remains native focus navigation. */
export const localAcceleratorSchema = z
  .string()
  .min(1)
  .max(128)
  .refine((value) => {
    const parts = value.toLowerCase().split('+');

    return (
      parts.at(-1) !== 'tab' &&
      !parts.includes('altgr') &&
      (acceleratorSchema.safeParse(value).success ||
        (parts.length === 1 && acceleratorSchema.safeParse(`Control+${value}`).success))
    );
  });

export const localShortcutsSchema = z.strictObject({
  next: localAcceleratorSchema,
  previous: localAcceleratorSchema,
  copy: localAcceleratorSchema,
  delete: localAcceleratorSchema,
  deleteAlternate: localAcceleratorSchema.nullable(),
  focusSearch: localAcceleratorSchema,
  tag: localAcceleratorSchema,
  settings: localAcceleratorSchema,
  dismiss: localAcceleratorSchema,
  cancelEdit: localAcceleratorSchema
});

export type LocalShortcuts = z.infer<typeof localShortcutsSchema>;

export function defaultLocalShortcuts(): LocalShortcuts {
  return {
    next: 'Down',
    previous: 'Up',
    copy: 'Return',
    delete: 'Delete',
    deleteAlternate: 'Backspace',
    focusSearch: 'CommandOrControl+F',
    tag: 'CommandOrControl+T',
    settings: 'CommandOrControl+,',
    dismiss: 'Escape',
    cancelEdit: 'Escape'
  };
}
