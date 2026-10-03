import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import type { TagSummary } from '../../../../shared/contracts/domain';
import { Button } from '../../../components/ui/button';
import { DialogFooter } from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '../../../components/ui/dropdown-menu';
import { Label } from '../../../components/ui/label';
import { tagColorStyle } from '../../../lib/tag-palette';
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
  const target = targets.find((item) => item.id === targetId);

  return (
    <TagDialog
      {...dialog}
      title={`Merge “${tag.name}”`}
      description="All snippets using this tag will use the target tag. The source tag is removed; snippets are kept."
    >
      <div className="tag-management-field">
        <Label htmlFor={selectId}>Merge into</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id={selectId}
              variant="outline"
              className="tag-management-select"
              disabled={dialog.pending || targets.length === 0}
            >
              {target !== undefined && (
                <span
                  className="library-tag-dot"
                  style={tagColorStyle(target.color)}
                  aria-hidden="true"
                />
              )}
              <span>{target?.name ?? 'Choose a target tag'}</span>
              <ChevronDown aria-hidden="true" size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="tag-merge-menu" align="start">
            <DropdownMenuRadioGroup value={valid ? targetId : ''} onValueChange={setTargetId}>
              {targets.map((item) => (
                <DropdownMenuRadioItem key={item.id} value={item.id}>
                  <span
                    className="library-tag-dot"
                    style={tagColorStyle(item.color)}
                    aria-hidden="true"
                  />
                  <span className="tag-picker-name">{item.name}</span>
                  <span className="tag-picker-count">{item.snippetCount}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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
