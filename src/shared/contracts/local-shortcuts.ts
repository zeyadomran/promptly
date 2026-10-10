import { z } from 'zod';

import { editableBindingAllowed } from '../shortcuts/editable';
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
  newSnippet: localAcceleratorSchema.nullable(),
  showLibrary: localAcceleratorSchema.nullable(),
  showQueue: localAcceleratorSchema.nullable(),
  copyAndReturn: localAcceleratorSchema.nullable(),
  queueComplete: localAcceleratorSchema.nullable(),
  moveUp: localAcceleratorSchema.nullable(),
  moveDown: localAcceleratorSchema.nullable(),
  bundle: localAcceleratorSchema.nullable(),
  delete: localAcceleratorSchema,
  deleteAlternate: localAcceleratorSchema.nullable(),
  focusSearch: localAcceleratorSchema,
  tag: localAcceleratorSchema,
  settings: localAcceleratorSchema,
  dismiss: localAcceleratorSchema,
  cancelEdit: localAcceleratorSchema.refine(
    editableBindingAllowed,
    'Cancel text edit needs Esc, a function key, or a Ctrl/Win combination that does not replace text editing or clipboard keys.'
  )
});

export type LocalShortcuts = z.infer<typeof localShortcutsSchema>;
export const optionalLocalShortcutActions = [
  'newSnippet',
  'showLibrary',
  'showQueue',
  'copyAndReturn',
  'queueComplete',
  'moveUp',
  'moveDown',
  'bundle'
] as const;

export function defaultLocalShortcuts(): LocalShortcuts {
  return {
    next: 'Down',
    previous: 'Up',
    copy: 'Return',
    newSnippet: 'CommandOrControl+N',
    showLibrary: 'CommandOrControl+1',
    showQueue: 'CommandOrControl+2',
    copyAndReturn: 'CommandOrControl+Return',
    queueComplete: 'CommandOrControl+D',
    moveUp: 'Alt+Up',
    moveDown: 'Alt+Down',
    bundle: 'CommandOrControl+B',
    delete: 'Delete',
    deleteAlternate: 'Backspace',
    focusSearch: 'CommandOrControl+F',
    tag: 'CommandOrControl+T',
    settings: 'CommandOrControl+,',
    dismiss: 'Escape',
    cancelEdit: 'Escape'
  };
}
