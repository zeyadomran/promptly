import { Plus } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { tagColorClasses } from '../../lib/tag-palette';
import { useLibraryTagActions } from './library-commands';
import { useLibrary } from './library-context';

export function LibraryTags({ regular = false }: { regular?: boolean }) {
  const { state, model } = useLibrary();
  const actions = useLibraryTagActions();

  return (
    <div className="library-tags" role="group" aria-label="Filter by tag">
      <Button
        variant="ghost"
        size="xs"
        className="library-tag-chip library-tag-all"
        aria-pressed={state.request.tagIds.length === 0 && !state.request.untagged}
        onClick={() => {
          model.query({ ...state.request, tagIds: [], untagged: false });
        }}
      >
        All
      </Button>
      {regular && (
        <Button
          variant="ghost"
          size="xs"
          className="library-tag-chip"
          aria-pressed={state.request.untagged}
          onClick={() => {
            model.query({ ...state.request, tagIds: [], untagged: !state.request.untagged });
          }}
        >
          Untagged
        </Button>
      )}
      {state.tags.map((tag) => (
        <Button
          key={tag.id}
          variant="ghost"
          size="xs"
          className="library-tag-chip"
          aria-pressed={state.request.tagIds.includes(tag.id)}
          onClick={() => {
            const tagIds = state.request.tagIds.includes(tag.id)
              ? state.request.tagIds.filter((id) => id !== tag.id)
              : [...state.request.tagIds, tag.id];

            model.query({ ...state.request, tagIds, untagged: false });
          }}
        >
          <span aria-hidden="true" className={`library-tag-dot ${tagColorClasses[tag.color]}`} />
          {tag.name}
        </Button>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size={regular ? 'xs' : 'icon-xs'}
              className="library-create-tag"
              disabled={actions === undefined}
              aria-label="Create tag"
              onClick={(event) => {
                actions?.createTag(event.currentTarget);
              }}
            >
              <Plus aria-hidden="true" />
              {regular && 'New tag'}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Create tag</TooltipContent>
      </Tooltip>
    </div>
  );
}
