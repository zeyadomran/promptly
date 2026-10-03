import { Pencil, Trash2 } from 'lucide-react';

import type { TagSummary } from '../../../../shared/contracts/domain';
import { IconButton } from '../../../components/shared/IconButton';
import { Button } from '../../../components/ui/button';
import { TagBadge } from '../../tags/TagBadge';

export type TagAction = 'edit' | 'merge' | 'delete';

export function TagManagementRow({
  tag,
  disabled,
  open
}: {
  tag: TagSummary;
  disabled: boolean;
  open: (action: TagAction, trigger: HTMLElement) => void;
}) {
  return (
    <tr>
      <th scope="row">
        <TagBadge name={tag.name} color={tag.color} />
      </th>
      <td className="tag-management-count">{tag.snippetCount}</td>
      <td>
        <div className="tag-management-actions">
          <IconButton
            icon={Pencil}
            label={`Edit ${tag.name}`}
            disabled={disabled}
            onClick={(event) => {
              open('edit', event.currentTarget);
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={`Merge ${tag.name}`}
            onClick={(event) => {
              open('merge', event.currentTarget);
            }}
          >
            Merge
          </Button>
          <IconButton
            icon={Trash2}
            label={`Delete ${tag.name}`}
            className="tag-management-delete"
            disabled={disabled}
            onClick={(event) => {
              open('delete', event.currentTarget);
            }}
          />
        </div>
      </td>
    </tr>
  );
}
