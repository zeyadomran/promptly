import { ListFilter, X } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { tagColorStyle } from '../../lib/tag-palette';
import { TagName } from '../tags/TagName';
import { TagOverflowRow } from '../tags/TagOverflowRow';
import { useLibraryTagActions } from './library-commands';
import { useLibrary } from './library-context';

export function LibraryTags() {
  const { state, model } = useLibrary();
  const actions = useLibraryTagActions();
  const selected = state.request.tagIds;
  const tags = [...state.tags].sort(
    (a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id))
  );
  const toggle = (id: string) => {
    const tagIds = selected.includes(id)
      ? selected.filter((tagId) => tagId !== id)
      : [...selected, id];

    model.query({ ...state.request, tagIds, untagged: false });
  };

  return (
    <TagOverflowRow
      className="library-tags"
      label="Filter by tag"
      leading={
        selected.length === 0 &&
        !state.request.untagged &&
        state.request.query === '' ? undefined : (
          <Button
            variant="ghost"
            size="xs"
            className="library-tag-chip library-tag-all"
            aria-label="Clear search and filters"
            onClick={() => {
              model.query({ ...state.request, query: '', tagIds: [], untagged: false });
            }}
          >
            <X aria-hidden="true" />
            {state.request.untagged ? 'Untagged' : 'Clear'}
          </Button>
        )
      }
      endWhenFits
      items={tags.map((tag) => ({
        id: tag.id,
        content: (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className="library-tag-chip"
                aria-pressed={selected.includes(tag.id)}
                aria-label={tag.name + ', ' + String(tag.snippetCount) + ' snippets'}
                disabled={!selected.includes(tag.id) && selected.length >= 100}
                onClick={() => {
                  toggle(tag.id);
                }}
              >
                <span
                  aria-hidden="true"
                  className="library-tag-dot"
                  style={tagColorStyle(tag.color)}
                />
                <TagName name={tag.name} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tag.name}</TooltipContent>
          </Tooltip>
        )
      }))}
      overflow={(hidden, measuring) => (
        <Button
          data-tag-picker-trigger="filter-overflow"
          variant="ghost"
          size="xs"
          className="library-tag-chip tag-overflow-trigger"
          aria-label={'Show ' + String(hidden) + ' more tags'}
          aria-haspopup="dialog"
          aria-expanded={measuring !== true && actions?.activeTrigger === 'filter-overflow'}
          disabled={actions === undefined}
          onClick={(event) => {
            actions?.createTag(event.currentTarget);
          }}
        >
          +{hidden}
        </Button>
      )}
      end={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-tag-picker-trigger="filter-create"
              variant="ghost"
              size="icon-xs"
              className="library-create-tag tag-overflow-trigger"
              aria-label="Filter or create tags"
              aria-haspopup="dialog"
              aria-expanded={actions?.activeTrigger === 'filter-create'}
              disabled={actions === undefined}
              onClick={(event) => {
                actions?.createTag(event.currentTarget);
              }}
            >
              <ListFilter aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Filter or create tags</TooltipContent>
        </Tooltip>
      }
    />
  );
}
