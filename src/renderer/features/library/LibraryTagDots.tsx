import type { Snippet } from '../../../shared/contracts/domain';
import { tagColorStyle } from '../../lib/tag-palette';

/** Both library views show every assignment in the same bounded, column-first grid. */
export function LibraryTagDots({ tags }: { tags: Snippet['tags'] }) {
  if (tags.length === 0) return null;
  return (
    <div className="library-row-dots" data-dot-rows={Math.min(tags.length, 5)} aria-hidden="true">
      {tags.map((tag) => (
        <span
          key={tag.id}
          title={tag.name}
          className="library-tag-dot"
          style={tagColorStyle(tag.color)}
        />
      ))}
    </div>
  );
}
