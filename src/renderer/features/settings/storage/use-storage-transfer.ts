import { useEffect, useRef, useState } from 'react';

import type { ImportPreview } from '../../../../shared/contracts/backup/operations';
import type { DesktopResult } from '../../../../shared/contracts/result';

export function useStorageTransfer() {
  const [preview, setPreview] = useState<ImportPreview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [clearError, setClearError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const busy = useRef(false);
  const active = useRef(true);
  const token = useRef<string | undefined>(undefined);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (token.current !== undefined)
        void window.promptly.cancelLibraryImport({ token: token.current });
    };
  }, []);

  const run = async <T>(action: () => Promise<DesktopResult<T>>) => {
    if (busy.current) return undefined;
    busy.current = true;
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await action();

      if (!result.ok && active.current) setError(result.error.message);
      return result;
    } catch {
      if (active.current) setError('Unable to complete storage transfer. Try again.');
      return undefined;
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  };

  const exportLibrary = async (format: 'json' | 'markdown') => {
    const result = await run(() => window.promptly.exportLibrary({ format }));

    if (result?.ok === true && active.current)
      setMessage(
        result.value.status === 'cancelled'
          ? 'Export canceled.'
          : `${result.value.filename} exported.${(result.value.attachmentsOmitted ?? 0) > 0 ? ` Text only: ${String(result.value.attachmentsOmitted)} attachment files omitted.` : ''}`
      );
  };

  const chooseImport = async () => {
    const result = await run(() => window.promptly.previewLibraryImport({}));

    if (result?.ok !== true) return;
    if (result.value.status === 'cancelled') {
      if (active.current) setMessage('Import canceled.');
      return;
    }

    if (!active.current) {
      await window.promptly.cancelLibraryImport({ token: result.value.preview.token });
      return;
    }

    token.current = result.value.preview.token;
    setPreview(result.value.preview);
  };

  const cancelImport = async () => {
    if (preview === undefined) return;
    const result = await run(() => window.promptly.cancelLibraryImport({ token: preview.token }));

    if (
      result !== undefined &&
      active.current &&
      (result.ok || result.error.code === 'NOT_FOUND')
    ) {
      token.current = undefined;
      setPreview(undefined);
      setError(undefined);
      setMessage('Import canceled.');
    }
  };

  const confirmImport = async () => {
    if (preview === undefined) return;
    const result = await run(() =>
      window.promptly.confirmLibraryImport({ token: preview.token, revision: preview.revision })
    );

    if (result === undefined || !active.current) return;
    if (result.ok || result.error.code === 'CONFLICT' || result.error.code === 'NOT_FOUND') {
      token.current = undefined;
      setPreview(undefined);
    }

    if (result.ok)
      setMessage(
        `Import complete: ${String(preview.snippets - preview.skippedSnippets)} snippets, ${String((preview.queueItems ?? 0) - (preview.skippedQueueItems ?? 0))} queued prompts and ${String((preview.assets ?? 0) - (preview.skippedAssets ?? 0))} attachment files added.`
      );
  };

  const clear = async () => {
    setClearError(undefined);
    const result = await run(() => window.promptly.clearLibrary({ confirmation: 'CLEAR ALL' }));

    if (result?.ok !== true && active.current) {
      setError(undefined);
      setClearError(
        result === undefined ? 'Unable to clear the library. Try again.' : result.error.message
      );
    }

    if (result?.ok === true && active.current)
      setMessage(
        'Library, Queue, tags, attachments and unsaved drafts cleared. Preferences were kept.'
      );
    return result?.ok === true;
  };

  return {
    preview,
    pending,
    error,
    clearError,
    message,
    exportLibrary,
    chooseImport,
    cancelImport,
    confirmImport,
    clear
  };
}
