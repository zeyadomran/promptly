import { useId, useRef, useState } from 'react';

import { tagInputNameSchema, type TagSummary } from '../../../../shared/contracts/domain';
import { Button } from '../../../components/ui/button';
import { DialogFooter } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import type { TagColor } from '../../../lib/tag-palette';
import { TagColorPicker } from './TagColorPicker';
import { TagDialog, type TagDialogProps } from './TagDialog';

export function TagEditorDialog({
  tag,
  initialColor,
  save,
  ...dialog
}: TagDialogProps & {
  tag: TagSummary | undefined;
  initialColor: TagColor;
  save: (name: string, color: TagColor) => Promise<void>;
}) {
  const [name, setName] = useState(tag?.name ?? '');
  const [color, setColor] = useState(tag?.color ?? initialColor);
  const [validation, setValidation] = useState<string>();
  const composing = useRef(false);
  const nameId = useId();

  return (
    <TagDialog
      {...dialog}
      title={tag === undefined ? 'New tag' : 'Edit tag'}
      description="Names are trimmed and saved in lowercase. Choose a name and color."
    >
      <form
        className="tag-management-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (dialog.pending || composing.current) return;
          const parsed = tagInputNameSchema.safeParse(name);

          if (!parsed.success) {
            setValidation('Enter a name of 1–64 characters using well-formed Unicode.');
            return;
          }

          setValidation(undefined);
          void save(parsed.data, color);
        }}
      >
        <div className="tag-management-field">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            value={name}
            disabled={dialog.pending}
            maxLength={256}
            aria-invalid={validation !== undefined}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onChange={(event) => {
              setName(event.target.value);
              setValidation(undefined);
            }}
          />
        </div>
        <div className="tag-management-field">
          <span>Color</span>
          <TagColorPicker color={color} disabled={dialog.pending} change={setColor} />
        </div>
        {validation !== undefined && (
          <p className="settings-row-error" role="alert">
            {validation}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={dialog.pending} onClick={dialog.close}>
            Cancel
          </Button>
          <Button type="submit" disabled={dialog.pending}>
            {dialog.pending ? 'Saving…' : 'Save tag'}
          </Button>
        </DialogFooter>
      </form>
    </TagDialog>
  );
}
