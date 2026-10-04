import type { ComponentProps } from 'react';

import { useWikiNavigation } from './wiki-context';
import { resolveWikiLink } from './wiki-navigation';

export function WikiLink({ href, children }: ComponentProps<'a'>) {
  const navigation = useWikiNavigation();
  const destination = resolveWikiLink(href ?? '');

  if (destination === undefined) return <span>{children}</span>;
  const localHref =
    destination.kind === 'page'
      ? `#wiki/${destination.page}`
      : destination.kind === 'settings'
        ? `#settings/${destination.section}`
        : `#wiki-resource/${destination.resource}`;

  return (
    <a
      href={localHref}
      onAuxClick={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        event.preventDefault();
        if (destination.kind === 'page') navigation.showPage(destination.page);
        else if (destination.kind === 'settings') navigation.showSettings(destination.section);
        else navigation.openResource(destination.resource);
      }}
    >
      {children}
    </a>
  );
}
