import { ExternalLink } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { useApplicationInfo } from '../hooks/use-application-info';
import { StorageRow } from '../storage/StorageRow';

export function ApplicationSettings() {
  const { version, versionError, linkError, opening, openRepository } = useApplicationInfo();

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
      <StorageRow label="Updates" description="Update checks are not available yet.">
        <Button variant="outline" disabled>
          Check for updates
        </Button>
      </StorageRow>
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
      {linkError !== undefined && (
        <p className="settings-row-error" role="alert">
          {linkError}
        </p>
      )}
    </section>
  );
}
