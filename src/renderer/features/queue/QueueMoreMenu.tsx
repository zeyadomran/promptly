import {
  ArrowUpToLineIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SaveIcon,
  Trash2Icon
} from 'lucide-react';

import type { QueuePreview } from '../../../shared/contracts/queue';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useQueue } from './queue-context';

export function QueueMoreMenu({
  item,
  onEdit,
  tabIndex = 0
}: {
  item: QueuePreview;
  onEdit: (id: string) => Promise<void>;
  tabIndex?: number;
}) {
  const { state, model } = useQueue();
  const disabled = state.pending || state.loading;
  const runEdit = () => {
    void onEdit(item.id).catch(() => {
      model.report('Unable to open this prompt for editing.');
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="More prompt actions"
          tabIndex={tabIndex}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            model.select(item.id);
          }}
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <DropdownMenuItem onSelect={runEdit}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void model.saveLibrary(item.id);
          }}
        >
          <SaveIcon />
          Save to library
        </DropdownMenuItem>
        {item.completedAt === null && (
          <DropdownMenuItem
            disabled={item.position === 0}
            onSelect={() => {
              void model.reorder(
                item.id,
                state.items.find((entry) => entry.completedAt === null)?.id
              );
            }}
          >
            <ArrowUpToLineIcon />
            Move to top
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void model.delete(item.id);
          }}
        >
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
