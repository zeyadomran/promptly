import type { WikiPageId } from '../../../shared/contracts/wiki';
import { wikiPages } from './wiki-pages';

export function WikiPageNavigation({
  index,
  onSelect
}: {
  index: number;
  onSelect: (page: WikiPageId) => void;
}) {
  const previous = wikiPages[index - 1];
  const next = wikiPages[index + 1];

  return (
    <nav className="wiki-page-navigation" aria-label="Previous and next wiki pages">
      {previous === undefined ? (
        <span />
      ) : (
        <button
          onClick={() => {
            onSelect(previous.id);
          }}
        >
          <span>Previous</span>
          {previous.title}
        </button>
      )}
      {next === undefined ? (
        <span />
      ) : (
        <button
          className="wiki-page-next"
          onClick={() => {
            onSelect(next.id);
          }}
        >
          <span>Next</span>
          {next.title}
        </button>
      )}
    </nav>
  );
}
