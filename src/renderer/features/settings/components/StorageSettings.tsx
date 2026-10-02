import { useRef } from 'react';

import { Button } from '../../../components/ui/button';
import { ClearLibraryDialog } from '../storage/ClearLibraryDialog';
import { ImportPreviewDialog } from '../storage/ImportPreviewDialog';
import { StorageRow } from '../storage/StorageRow';
import { useStorageTransfer } from '../storage/use-storage-transfer';

export function StorageSettings() {
  const transfer = useStorageTransfer();
  const importButton = useRef<HTMLButtonElement>(null);

  return (
    <div className="storage-settings">
      <StorageRow
        label="Data location"
        description={transfer.directory ?? 'Reading your data location…'}
      >
        <Button
          variant="outline"
          disabled={transfer.pending || transfer.directory === undefined}
          onClick={() => {
            void transfer.reveal();
          }}
        >
          Reveal in Explorer
        </Button>
      </StorageRow>
      <StorageRow
        label="Export"
        description="JSON is a portable backup. Markdown is a readable copy of your full text."
      >
        <div className="storage-actions" role="group" aria-label="Export format">
          <Button
            variant="outline"
            disabled={transfer.pending}
            onClick={() => {
              void transfer.exportLibrary('json');
            }}
          >
            JSON
          </Button>
          <Button
            variant="outline"
            disabled={transfer.pending}
            onClick={() => {
              void transfer.exportLibrary('markdown');
            }}
          >
            Markdown
          </Button>
        </div>
      </StorageRow>
      <StorageRow
        label="Import"
        description="Choose a Promptly JSON backup and review it before importing."
      >
        <Button
          variant="outline"
          disabled={transfer.pending}
          ref={importButton}
          onClick={() => {
            void transfer.chooseImport();
          }}
        >
          Import JSON…
        </Button>
      </StorageRow>
      <StorageRow
        label="Clear all"
        description="Permanently remove library data. Your preferences are kept."
      >
        <ClearLibraryDialog
          pending={transfer.pending}
          error={transfer.clearError}
          clear={transfer.clear}
        />
      </StorageRow>
      {transfer.error !== undefined && transfer.preview === undefined && (
        <p className="settings-row-error" role="alert">
          {transfer.error}
        </p>
      )}
      {transfer.message !== undefined && (
        <p className="storage-note" role="status">
          {transfer.message}
        </p>
      )}
      <ImportPreviewDialog
        preview={transfer.preview}
        pending={transfer.pending}
        error={transfer.error}
        cancel={transfer.cancelImport}
        confirm={transfer.confirmImport}
        restoreFocus={() => importButton.current?.focus()}
      />
    </div>
  );
}
