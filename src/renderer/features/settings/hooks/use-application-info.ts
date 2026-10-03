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

  return { version, versionError, linkError, opening, openRepository };
}
