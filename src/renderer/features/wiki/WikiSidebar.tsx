import type { WikiPageId } from '../../../shared/contracts/wiki';
import { wikiPages } from './wiki-pages';
import { WikiEditLink } from './WikiEditLink';

export function WikiSidebar({
  page,
  onSelect,
  onEdit,
  opening
}: {
  page: WikiPageId;
  onSelect: (page: WikiPageId) => void;
  onEdit: () => void;
  opening: boolean;
}) {
  return (
    <nav className="wiki-sidebar" aria-label="Wiki pages">
      <div className="wiki-page-list">
        {wikiPages.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
            }}
            aria-current={item.id === page ? 'page' : undefined}
          >
            {item.title}
          </button>
        ))}
      </div>
      <WikiEditLink onEdit={onEdit} disabled={opening} />
    </nav>
  );
}
