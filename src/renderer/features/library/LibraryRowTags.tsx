import type { SnippetPreview } from '../../../shared/contracts/domain';
import { tagColorStyle } from '../../lib/tag-palette';
import { useRowTagOverflow } from './use-row-tag-overflow';

export function LibraryRowTags({ tags }: { tags: SnippetPreview['tags'] }) {
  const { container, visible } = useRowTagOverflow(tags);
  const hidden = tags.length - visible;

  return (
    <div ref={container} className="library-row-tags" aria-hidden="true">
      {tags.map((tag, index) => (
        <span key={tag.id} data-row-tag="" data-row-hidden={index >= visible}>
          <span className="library-tag-dot" style={tagColorStyle(tag.color)} />
          {tag.name}
        </span>
      ))}
      {hidden > 0 && <span className="library-row-tag-overflow">+{hidden}</span>}
      {tags.map((tag, index) => (
        <span key={tag.id} data-row-overflow={index + 1} data-row-hidden="true">
          +{index + 1}
        </span>
      ))}
    </div>
  );
}
