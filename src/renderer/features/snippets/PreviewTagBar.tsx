import { Plus } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { useLibraryTagActions } from '../library/library-commands';
import { TagBadge } from '../tags/TagBadge';

/** The shared picker owns all mutations; this surface only supplies entrypoints. */
export function PreviewTagBar({ snippet }: { snippet: Snippet }) {
  const tags = useLibraryTagActions();

  return (
    <div className="preview-tag-bar" aria-label="Snippet tags">
      {snippet.tags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          disabled={tags?.busy ?? false}
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
        disabled={tags === undefined || tags.busy === true}
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
