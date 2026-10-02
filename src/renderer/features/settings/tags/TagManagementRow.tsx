import type { TagSummary } from '../../../../shared/contracts/domain';
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
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={`Edit ${tag.name}`}
            onClick={(event) => {
              open('edit', event.currentTarget);
            }}
          >
            Edit
          </Button>
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
          <Button
            size="sm"
            variant="ghost"
            className="tag-management-delete"
            disabled={disabled}
            aria-label={`Delete ${tag.name}`}
            onClick={(event) => {
              open('delete', event.currentTarget);
            }}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
