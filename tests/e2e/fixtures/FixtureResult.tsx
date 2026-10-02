import { HighlightedText } from '../../../src/renderer/components/shared/HighlightedText';
import type { SearchPage } from '../../../src/shared/contracts/domain';

/** Dense row preview plus one full selected preview follows SPEC 3b's result contract. */
export function FixtureResult({ page }: { page: SearchPage }) {
  return (
    <section aria-label="Results">
      {page.items.map((item) => (
        <article key={item.id}>
          <pre>
            <HighlightedText
              text={item.text.slice(0, 160)}
              ranges={(page.matches?.[item.id] ?? []).filter((range) => range.end <= 160)}
            />
          </pre>
        </article>
      ))}
      {page.items[0] !== undefined && (
        <aside aria-label="Selected full text">
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
}
