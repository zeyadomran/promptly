import { Plus } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { tagColorStyle } from '../../lib/tag-palette';
import { TagName } from '../tags/TagName';
import { TagOverflowRow } from '../tags/TagOverflowRow';
import { useLibraryTagActions } from './library-commands';
import { useLibrary } from './library-context';

export function LibraryTags({ regular = false }: { regular?: boolean }) {
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
        tags.length === 0 ? undefined : (
          <Button
            variant="ghost"
            size="xs"
            className="library-tag-chip library-tag-all"
            aria-pressed={selected.length === 0 && !state.request.untagged}
            onClick={() => {
              model.query({ ...state.request, tagIds: [], untagged: false });
            }}
          >
            All
          </Button>
        )
      }
      items={tags.map((tag) => ({
        id: tag.id,
        content: (
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
            <span aria-hidden="true" className="library-tag-dot" style={tagColorStyle(tag.color)} />
            <TagName name={tag.name} />
          </Button>
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
        <Button
          data-tag-picker-trigger="filter-create"
          variant="ghost"
          size={regular ? 'xs' : 'icon-xs'}
          className="library-create-tag tag-overflow-trigger"
          aria-label="Create tag"
          aria-haspopup="dialog"
          aria-expanded={actions?.activeTrigger === 'filter-create'}
          disabled={actions === undefined}
          onClick={(event) => {
            actions?.createTag(event.currentTarget);
          }}
        >
          <Plus aria-hidden="true" />
          {regular && 'New tag'}
        </Button>
      }
    />
  );
}
