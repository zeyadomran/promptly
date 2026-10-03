import type { WikiPageId, WikiResource } from '../../../shared/contracts/wiki';
import { wikiPageIdSchema, wikiResourceSchema } from '../../../shared/contracts/wiki';
import { wikiResourceUrls } from '../../../shared/wiki-resources';

export type WikiSettingsSection =
  'general' | 'shortcuts' | 'appearance' | 'tags' | 'storage' | 'about';
export type WikiDestination =
  | { kind: 'page'; page: WikiPageId }
  | { kind: 'settings'; section: WikiSettingsSection }
  | { kind: 'resource'; resource: WikiResource };

const settingsSections: readonly string[] = [
  'general',
  'shortcuts',
  'appearance',
  'tags',
  'storage',
  'about'
];

/** No URL is forwarded to the privileged opener or followed by the renderer. */
export function resolveWikiLink(href: string): WikiDestination | undefined {
  const section = href.startsWith('promptly:settings/') ? href.slice(18) : undefined;

  if (section !== undefined && settingsSections.includes(section))
    return { kind: 'settings', section: section as WikiSettingsSection };
  const prefix = 'https://github.com/zeyadomran/promptly/wiki';
  const slug =
    href === prefix || href === `${prefix}/`
      ? 'Home'
      : href.startsWith(`${prefix}/`)
        ? href.slice(prefix.length + 1)
        : href;
  const page = wikiPageIdSchema.safeParse(slug);

  if (page.success) return { kind: 'page', page: page.data };
  for (const resource of wikiResourceSchema.options) {
    if (href === wikiResourceUrls[resource]) return { kind: 'resource', resource };
  }

  return undefined;
}
