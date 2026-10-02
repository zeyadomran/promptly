import { useEffect } from 'react';
import { toast, useSonner } from 'sonner';

import { CaptureToastContent } from './CaptureToastContent';

const confirmationId = 'committed-capture';

/** Headless Sonner avoids inline Toaster layout styles and focus-dependent expiration. */
export function CaptureConfirmation() {
  const { toasts } = useSonner();

  useEffect(
    () =>
      window.promptlyConfirmation.subscribe((confirmation) => {
        if (confirmation === null) {
          toast.dismiss(confirmationId);
          return;
        }

        document.documentElement.dataset.theme = confirmation.theme;
        toast.custom(() => <CaptureToastContent confirmation={confirmation} />, {
          id: confirmationId,
          duration: Infinity,
          dismissible: false
        });
      }),
    []
  );
  return toasts.find((item) => item.id === confirmationId)?.jsx ?? null;
}
