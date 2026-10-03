import { ExternalLink } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { useApplicationInfo } from '../hooks/use-application-info';
import { StorageRow } from '../storage/StorageRow';
import { UpdateSettings } from './UpdateSettings';

export function ApplicationSettings() {
  const { version, versionError, linkError, opening, openRepository, openWiki, openPrivacyPolicy } =
    useApplicationInfo();

  return (
    <section className="application-settings" aria-label="Version and updates">
      <StorageRow label="Version" description="The version of Promptly running on your computer.">
        <span>{version ?? (versionError === undefined ? 'Reading version' : 'Unavailable')}</span>
      </StorageRow>
      {versionError !== undefined && (
        <p className="settings-row-error" role="alert">
          {versionError}
        </p>
      )}
      <UpdateSettings />
      <StorageRow label="GitHub" description="View the source code and report issues.">
        <Button variant="outline" asChild>
          <a
            href="https://github.com/zeyadomran/promptly"
            aria-disabled={opening}
            onClick={(event) => {
              event.preventDefault();
              void openRepository();
            }}
          >
            Open repository
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </StorageRow>
      <StorageRow label="Wiki" description="Read the Promptly user guide.">
        <Button variant="outline" asChild>
          <a
            href="https://github.com/zeyadomran/promptly/wiki"
            aria-disabled={opening}
            onClick={(event) => {
              event.preventDefault();
              void openWiki();
            }}
          >
            Open wiki
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </StorageRow>
      <StorageRow label="Privacy" description="Read how Promptly handles your information.">
        <Button variant="outline" asChild>
          <a
            href="https://github.com/zeyadomran/promptly/blob/main/PRIVACY.md"
            aria-disabled={opening}
            onClick={(event) => {
              event.preventDefault();
              void openPrivacyPolicy();
            }}
          >
            Privacy policy
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </StorageRow>
      {linkError !== undefined && (
        <p className="settings-row-error" role="alert">
          {linkError}
        </p>
      )}
    </section>
  );
}
