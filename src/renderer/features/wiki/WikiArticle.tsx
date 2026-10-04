import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { resolveWikiLink } from './wiki-navigation';
import type { WikiPage } from './wiki-pages';
import { WikiCode } from './WikiCode';
import { WikiLink } from './WikiLink';

const plugins = [remarkGfm];
const components = { a: WikiLink, code: WikiCode };
const allowedElements = [
  'h1',
  'h2',
  'h3',
  'p',
  'strong',
  'em',
  'a',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'del',
  'br'
];

export function WikiArticle({ page }: { page: WikiPage }) {
  const article = useRef<HTMLElement>(null);

  useEffect(() => {
    const heading = article.current?.querySelector('h1');

    if (heading !== null && heading !== undefined) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }

    const scroll = article.current?.closest('.wiki-scroll');

    scroll?.scrollTo({ top: 0 });
  }, [page.id]);
  return (
    <article className="wiki-article" ref={article} aria-label={page.title}>
      <p className="wiki-eyebrow">Guide · Available offline</p>
      <Markdown
        skipHtml
        allowedElements={allowedElements}
        remarkPlugins={plugins}
        components={components}
        urlTransform={(url) => (resolveWikiLink(url) === undefined ? '' : url)}
      >
        {page.markdown}
      </Markdown>
    </article>
  );
}
