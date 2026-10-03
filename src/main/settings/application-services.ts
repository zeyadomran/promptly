import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';

export function applicationServices(
  getVersion: () => string,
  openExternal: (url: string) => Promise<void>
): Pick<
  DesktopOperations,
  'getApplicationInfo' | 'openRepository' | 'openWiki' | 'openPrivacyPolicy'
> {
  return {
    getApplicationInfo: () => Promise.resolve({ ok: true, value: { version: getVersion() } }),
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
