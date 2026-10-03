import { expect, it } from 'vitest';

import { resolveWikiLink } from './wiki-navigation';

it('routes documented pages and settings locally and accepts only fixed project resources', () => {
  expect(resolveWikiLink('https://github.com/zeyadomran/promptly/wiki/Capturing-Text')).toEqual({
    kind: 'page',
    page: 'Capturing-Text'
  });
  expect(resolveWikiLink('Getting-Started')).toEqual({ kind: 'page', page: 'Getting-Started' });
  expect(resolveWikiLink('https://github.com/zeyadomran/promptly/wiki')).toEqual({
    kind: 'page',
    page: 'Home'
  });
  expect(resolveWikiLink('promptly:settings/shortcuts')).toEqual({
    kind: 'settings',
    section: 'shortcuts'
  });
  expect(resolveWikiLink('promptly:settings/about')).toEqual({
    kind: 'settings',
    section: 'about'
  });
  expect(resolveWikiLink('https://github.com/zeyadomran/promptly/blob/main/SECURITY.md')).toEqual({
    kind: 'resource',
    resource: 'security'
  });
  for (const href of [
    'javascript:alert(1)',
    'file:///private',
    'https://evil.example',
    'https://github.com.evil.example/zeyadomran/promptly/wiki',
    'https://github.com/zeyadomran/promptly/wiki/Unknown',
    'promptly:settings/unknown',
    '//evil.example',
    'https://github.com/zeyadomran/promptly?url=evil'
  ]) {
    expect(resolveWikiLink(href)).toBeUndefined();
  }
});
