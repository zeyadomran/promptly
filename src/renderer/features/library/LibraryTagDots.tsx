import type { Snippet } from '../../../shared/contracts/domain';
import { tagColorClasses } from '../../lib/tag-palette';

export function LibraryTagDots({ tags }: { tags: Snippet['tags'] }) {
  return (
    <div className="library-row-dots" aria-hidden="true">
      {tags.map((tag) => (
        <span key={tag.id} className={`library-tag-dot ${tagColorClasses[tag.color]}`} />
      ))}
    </div>
  );
}
