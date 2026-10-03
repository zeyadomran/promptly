import { useEffect, useState } from 'react';

export function useApplicationInfo() {
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

  const openLink = async (
    operation: 'openRepository' | 'openWiki' | 'openPrivacyPolicy',
    failureMessage: string
  ) => {
    if (opening) return;
    setOpening(true);
    setLinkError(undefined);
    try {
      const result = await window.promptly[operation]({});

      if (!result.ok) setLinkError(result.error.message);
    } catch {
      setLinkError(failureMessage);
    } finally {
      setOpening(false);
    }
  };

  return {
    version,
    versionError,
    linkError,
    opening,
    openRepository: () =>
      openLink('openRepository', 'Unable to open the GitHub repository. Try again.'),
    openWiki: () => openLink('openWiki', 'Unable to open the user wiki. Try again.'),
    openPrivacyPolicy: () =>
      openLink('openPrivacyPolicy', 'Unable to open the privacy policy. Try again.')
  };
}
