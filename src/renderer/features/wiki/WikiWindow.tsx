import { useState } from 'react';

import type { DesktopResult } from '../../../shared/contracts/result';
import type { WikiPageId, WikiResource } from '../../../shared/contracts/wiki';
import { WikiNavigationContext } from './wiki-context';
import type { WikiSettingsSection } from './wiki-navigation';
import { wikiPages } from './wiki-pages';
import { WikiArticle } from './WikiArticle';
import { WikiEditLink } from './WikiEditLink';
import { WikiPageBar } from './WikiPageBar';
import { WikiPageNavigation } from './WikiPageNavigation';
import { WikiSidebar } from './WikiSidebar';

export function WikiWindow({ onSettings }: { onSettings: (section: WikiSettingsSection) => void }) {
  const [pageId, setPageId] = useState<WikiPageId>('Home');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();
  const index = Math.max(
    0,
    wikiPages.findIndex((candidate) => candidate.id === pageId)
  );
  const page = wikiPages[index];

  if (page === undefined) throw new Error('The bundled wiki has no pages.');
  const showPage = (next: WikiPageId) => {
    setPageId(next);
    setError(undefined);
  };

  const open = async (request: () => Promise<DesktopResult<object>>) => {
    if (opening) return;
    setOpening(true);
    setError(undefined);
    try {
      const result = await request();

      if (!result.ok) setError(result.error.message);
    } catch {
      setError('Unable to open the browser. Try again.');
    } finally {
      setOpening(false);
    }
  };

  const openResource = (resource: WikiResource) => {
    void open(() => window.promptly.openWikiResource({ resource }));
  };

  const onEdit = () => {
    void open(() => window.promptly.openWikiPageEditor({ page: pageId }));
  };

  return (
    <WikiNavigationContext value={{ showPage, showSettings: onSettings, openResource }}>
      <section className="wiki-window" aria-label="Promptly wiki">
        <WikiPageBar page={page} index={index} onSelect={showPage} />
        <WikiSidebar page={pageId} onSelect={showPage} onEdit={onEdit} opening={opening} />
        <div className="wiki-scroll">
          {error === undefined ? null : (
            <p className="wiki-error" role="alert">
              {error}
            </p>
          )}
          <WikiArticle page={page} />
          <WikiPageNavigation index={index} onSelect={showPage} />
          <div className="wiki-compact-footer">
            <WikiEditLink onEdit={onEdit} disabled={opening} />
          </div>
        </div>
      </section>
    </WikiNavigationContext>
  );
}
