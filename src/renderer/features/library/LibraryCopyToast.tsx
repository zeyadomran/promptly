import { useEffect } from 'react';
import { toast, useSonner } from 'sonner';

import { LibraryCopyToastContent } from './LibraryCopyToastContent';

const confirmationId = 'library-copy';

export function notifyCopied(): void {
  toast.custom(() => <LibraryCopyToastContent />, {
    id: confirmationId,
    duration: Infinity,
    dismissible: false
  });
}

/** Headless Sonner keeps the packaged CSP and the command-owned 1500ms lifetime. */
export function LibraryCopyToast({ visible }: { visible: boolean }) {
  const { toasts } = useSonner();

  useEffect(
    () => () => {
      toast.dismiss(confirmationId);
    },
    []
  );
  return visible ? (toasts.find((item) => item.id === confirmationId)?.jsx ?? null) : null;
}
