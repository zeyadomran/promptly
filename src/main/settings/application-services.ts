import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { wikiResourceUrls } from '../../shared/wiki-resources';

export function applicationServices(
  getVersion: () => string,
  openExternal: (url: string) => Promise<void>
): Pick<
  DesktopOperations,
  | 'getApplicationInfo'
  | 'openRepository'
  | 'openWiki'
  | 'openPrivacyPolicy'
  | 'openWikiPageEditor'
  | 'openWikiResource'
> {
  return {
    getApplicationInfo: () => Promise.resolve({ ok: true, value: { version: getVersion() } }),
    async openWikiPageEditor({ page }) {
      try {
        await openExternal(`https://github.com/zeyadomran/promptly/wiki/${page}/_edit`);
        return { ok: true, value: {} };
      } catch {
        return failure('UNAVAILABLE', 'Unable to open the wiki editor. Try again.');
      }
    },
    async openWikiResource({ resource }) {
      try {
        await openExternal(wikiResourceUrls[resource]);
        return { ok: true, value: {} };
      } catch {
        return failure('UNAVAILABLE', 'Unable to open the project documentation. Try again.');
      }
    },
    async openRepository() {
      try {
        await openExternal('https://github.com/zeyadomran/promptly');
        return { ok: true, value: {} };
      } catch {
        return failure('UNAVAILABLE', 'Unable to open the GitHub repository. Try again.');
      }
    },
    async openWiki() {
      try {
        await openExternal('https://github.com/zeyadomran/promptly/wiki');
        return { ok: true, value: {} };
      } catch {
        return failure('UNAVAILABLE', 'Unable to open the user wiki. Try again.');
      }
    },
    async openPrivacyPolicy() {
      try {
        await openExternal('https://github.com/zeyadomran/promptly/blob/main/PRIVACY.md');
        return { ok: true, value: {} };
      } catch {
        return failure('UNAVAILABLE', 'Unable to open the privacy policy. Try again.');
      }
    }
  };
}
