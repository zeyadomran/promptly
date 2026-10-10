import { useEffect, useState } from 'react';

export function useAttachmentRaster(
  id: string,
  draftToken: string | undefined,
  preview = false,
  enabled = true
) {
  const key = JSON.stringify([id, draftToken, preview, enabled]);
  const [state, setState] = useState<{
    key: string;
    url: string | undefined;
    missing: boolean;
    error: string | undefined;
  }>({ key, url: undefined, missing: false, error: undefined });

  useEffect(() => {
    let active = true;
    let url: string | undefined;

    if (!enabled) return;
    const request = { id, ...(draftToken === undefined ? {} : { draftToken }) };

    void (
      preview
        ? window.promptly.getAttachmentImage({ ...request, purpose: 'preview' })
        : window.promptly.getAttachmentThumbnail(request)
    )
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setState({
            key,
            url: undefined,
            missing: result.error.code === 'NOT_FOUND',
            error: result.error.message
          });
          return;
        }

        url = URL.createObjectURL(
          new Blob([new Uint8Array(result.value.png).buffer], { type: 'image/png' })
        );
        setState({ key, url, missing: false, error: undefined });
      })
      .catch(() => {
        if (active)
          setState({ key, url: undefined, missing: false, error: 'Unable to load image.' });
      });
    return () => {
      active = false;
      if (url !== undefined) URL.revokeObjectURL(url);
    };
  }, [id, draftToken, preview, enabled, key]);
  return state.key === key ? state : { url: undefined, missing: false, error: undefined };
}
