import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../../../components/ui/button';
import { StorageRow } from '../storage/StorageRow';

export function ApplicationSettings() {
  const [version, setVersion] = useState<string>();
  const [versionError, setVersionError] = useState<string>();
  const [linkError, setLinkError] = useState<string>();
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let active = true;

    void window.promptly
      .getApplicationInfo({})
      .then((result) => {
        if (!active) return;
        if (result.ok) setVersion(result.value.version);
        else setVersionError(result.error.message);
      })
      .catch(() => {
        if (active) setVersionError('Unable to read the app version.');
      });
    return () => {
      active = false;
    };
  }, []);

  const openRepository = async () => {
    if (opening) return;
    setOpening(true);
    setLinkError(undefined);
    try {
      const result = await window.promptly.openRepository({});

      if (!result.ok) setLinkError(result.error.message);
    } catch {
      setLinkError('Unable to open the GitHub repository. Try again.');
    } finally {
      setOpening(false);
    }
  };

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
