import { memo } from 'react';

import { HighlightedText } from '../../../src/renderer/components/shared/HighlightedText';
import type { SearchPage } from '../../../src/shared/contracts/domain';

/** Dense row preview plus one full selected preview follows SPEC 3b's result contract. */
export const FixtureResult = memo(function SearchResults({ page }: { page: SearchPage }) {
  return (
    <section aria-label="Results">
      <div className="fixture-list" aria-label="Snippet list">
        {page.items.map((item) => (
          <article key={item.id}>
            <pre>
              <HighlightedText
                text={item.text.slice(0, 160)}
                ranges={(page.matches?.[item.id] ?? [])
                  .filter((range) => range.start < 160)
                  .map((range) => ({ ...range, end: Math.min(range.end, 160) }))}
              />
            </pre>
            <small>{item.sourceApp ?? 'No source'}</small>
          </article>
        ))}
      </div>
      {page.items[0] !== undefined && (
        <aside aria-label="Selected full text">
          <h2>Full text</h2>
          <pre>
            <HighlightedText
              text={page.items[0].text}
              ranges={page.matches?.[page.items[0].id] ?? []}
            />
          </pre>
        </aside>
      )}
    </section>
  );
});
