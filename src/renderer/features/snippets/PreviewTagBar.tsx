import { Plus } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { useLibraryTagActions } from '../library/library-commands';
import { TagBadge } from '../tags/TagBadge';
import { useSnippetSession } from './snippet-context';

/** The shared picker owns all mutations; this surface only supplies entrypoints. */
export function PreviewTagBar({ snippet }: { snippet: Snippet }) {
  const tags = useLibraryTagActions();
  const { state } = useSnippetSession();
  const disabled = state.loading || (tags?.busy ?? false);

  return (
    <div className="preview-tag-bar" aria-label="Snippet tags">
      {snippet.tags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          disabled={disabled}
          {...(tags?.removeTag === undefined
            ? {}
            : {
                onRemove: () => {
                  void tags.removeTag?.(snippet.id, tag.id);
                }
              })}
        />
      ))}
      <Button
        variant="outline"
        size="xs"
        className="preview-add-tag"
        disabled={tags === undefined || disabled}
        title={tags === undefined ? 'Tag editing is not available yet.' : undefined}
        onClick={(event) => {
          tags?.editSelectedTags(snippet.id, event.currentTarget);
        }}
      >
        <Plus aria-hidden="true" />
        Add tag
      </Button>
    </div>
  );
}
