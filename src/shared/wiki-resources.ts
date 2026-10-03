import type { WikiResource } from './contracts/wiki';

export const wikiResourceUrls: Readonly<Record<WikiResource, string>> = {
  repository: 'https://github.com/zeyadomran/promptly',
  releases: 'https://github.com/zeyadomran/promptly/releases',
  development: 'https://github.com/zeyadomran/promptly/blob/main/DEVELOPMENT.md',
  testing: 'https://github.com/zeyadomran/promptly/blob/main/TESTING.md',
  releasing: 'https://github.com/zeyadomran/promptly/blob/main/RELEASING.md',
  contributors: 'https://github.com/zeyadomran/promptly/blob/main/CONTRIBUTORS.md',
  security: 'https://github.com/zeyadomran/promptly/blob/main/SECURITY.md',
  licenses: 'https://github.com/zeyadomran/promptly/blob/main/packaging/README.md',
  history:
    'https://github.com/zeyadomran/promptly/tree/292f584f0424f8b2101d71472d40efc427804be4/docs'
};
