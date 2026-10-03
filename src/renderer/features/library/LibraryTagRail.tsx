import type { SnippetPreview } from '../../../shared/contracts/domain';
import { tagColorStyle } from '../../lib/tag-palette';

export function LibraryTagRail({ tags }: { tags: SnippetPreview['tags'] }) {
  const overflow = tags.length > 5;

  return (
    <div className="library-tag-rail" aria-hidden="true">
      {tags.slice(0, overflow ? 4 : 5).map((tag) => (
        <span key={tag.id} style={tagColorStyle(tag.color)} />
      ))}
      {(tags.length === 0 || overflow) && <span className="library-tag-rail-neutral" />}
    </div>
  );
}
