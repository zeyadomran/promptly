import { Plus, X } from 'lucide-react';

import type { Snippet } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { tagColorClasses } from '../../lib/tag-palette';
import { useLibraryTagActions } from '../library/library-commands';

/** The shared picker owns all mutations; this surface only supplies entrypoints. */
export function PreviewTagBar({ snippet }: { snippet: Snippet }) {
  const tags = useLibraryTagActions();

  return (
    <div className="preview-tag-bar" aria-label="Snippet tags">
      {snippet.tags.map((tag) => (
        <span key={tag.id} className={`preview-tag ${tagColorClasses[tag.color]}`}>
          {tag.name}
          {tags?.removeTag !== undefined && (
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={tags.busy}
              aria-label={`Remove ${tag.name} tag`}
              onClick={(event) => {
                event.stopPropagation();
                void tags.removeTag?.(snippet.id, tag.id);
              }}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </span>
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
