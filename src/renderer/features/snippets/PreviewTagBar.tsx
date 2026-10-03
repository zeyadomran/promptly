import { Plus } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { useLibraryTagActions } from '../library/library-commands';
import { TagBadge } from '../tags/TagBadge';
import { TagOverflowRow } from '../tags/TagOverflowRow';
import { PreviewMetadata } from './PreviewMetadata';
import { useSnippetSession } from './snippet-context';

export function PreviewTagBar({ snippet }: { snippet: Snippet }) {
  const tags = useLibraryTagActions();
  const { state } = useSnippetSession();
  const disabled = tags === undefined || state.loading || (tags.busy ?? false);
  const open = (element: HTMLElement) => {
    tags?.editSelectedTags(snippet.id, element);
  };

  return (
    <TagOverflowRow
      className="preview-tag-bar"
      label="Snippet tags"
      endWhenFits
      items={snippet.tags.map((tag) => ({
        id: tag.id,
        content: <TagBadge name={tag.name} color={tag.color} />
      }))}
      overflow={(hidden, measuring) => (
        <Badge asChild variant="outline" className="tag-badge">
          <Button
            data-tag-picker-trigger={'preview-overflow-' + snippet.id}
            variant="outline"
            size="xs"
            className="tag-overflow-trigger"
            disabled={disabled}
            aria-label={'Show ' + String(hidden) + ' more tags'}
            aria-haspopup="dialog"
            aria-expanded={
              measuring !== true && tags?.activeTrigger === 'preview-overflow-' + snippet.id
            }
            onClick={(event) => {
              open(event.currentTarget);
            }}
          >
            +{hidden}
          </Button>
        </Badge>
      )}
      end={
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge asChild variant="outline" className="tag-badge preview-add-tag">
              <Button
                data-tag-picker-trigger={'preview-add-' + snippet.id}
                variant="outline"
                size="xs"
                className="tag-overflow-trigger"
                disabled={disabled}
                aria-label="Add tag"
                aria-haspopup="dialog"
                aria-expanded={tags?.activeTrigger === 'preview-add-' + snippet.id}
                onClick={(event) => {
                  open(event.currentTarget);
                }}
              >
                <Plus aria-hidden="true" />
                {snippet.tags.length === 0 && 'Add tag'}
              </Button>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Add tag</TooltipContent>
        </Tooltip>
      }
      trailing={<PreviewMetadata snippet={snippet} />}
    />
  );
}
