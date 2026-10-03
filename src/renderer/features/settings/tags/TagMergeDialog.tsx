import { useId, useState } from 'react';

import type { TagSummary } from '../../../../shared/contracts/domain';
import { Button } from '../../../components/ui/button';
import { DialogFooter } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { TagDialog, type TagDialogProps } from './TagDialog';

export function TagMergeDialog({
  tag,
  tags,
  merge,
  ...dialog
}: TagDialogProps & {
  tag: TagSummary;
  tags: TagSummary[];
  merge: (targetId: string) => Promise<void>;
}) {
  const [targetId, setTargetId] = useState('');
  const selectId = useId();
  const targets = tags.filter((item) => item.id !== tag.id);
  const valid = targets.some((item) => item.id === targetId);

  return (
    <TagDialog
      {...dialog}
      title={`Merge “${tag.name}”`}
      description="All snippets using this tag will use the target tag. The source tag is removed; snippets are kept."
    >
      <div className="tag-management-field">
        <Label htmlFor={selectId}>Merge into</Label>
        <select
          id={selectId}
          className="tag-management-select"
          value={valid ? targetId : ''}
          disabled={dialog.pending || targets.length === 0}
          onChange={(event) => {
            setTargetId(event.target.value);
          }}
        >
          <option value="">Choose a target tag</option>
          {targets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {targets.length === 0 && <p>Create another tag before merging.</p>}
        {targetId !== '' && !valid && (
          <p role="status">The selected target is no longer available. Choose another tag.</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={dialog.pending} onClick={dialog.close}>
          Cancel
        </Button>
        <Button
          disabled={dialog.pending || !valid}
          onClick={() => {
            void merge(targetId);
          }}
        >
          {dialog.pending ? 'Merging' : 'Merge tags'}
        </Button>
      </DialogFooter>
    </TagDialog>
  );
}
