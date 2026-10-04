# Backup and Restore

Open [Settings → Storage](promptly:settings/storage) for export and import. Library data is stored locally in SQLite.

## Export a backup

1. Under **Export**, choose **JSON**.
2. Choose a destination in the Windows save dialog.
3. Keep the exported file somewhere safe before changing, upgrading, or uninstalling the app.

The JSON option exports a Promptly JSON Lines backup of the snippet library, tag definitions,
and memberships. **Markdown** exports a readable copy of the full snippet text; it is not
the restore format. Library transfer does not replace application preferences.

## Import a backup

1. Choose **Import JSON** and select a Promptly JSON Lines or supported legacy JSON backup.
2. Review the preview's snippet, tag, membership, remapped-ID, and already-present counts.
3. Choose **Import** to confirm or **Cancel** to leave the library unchanged.

Import adds data while keeping existing snippets. Identical versions are skipped. Different
IDs and conflicting versions are preserved, and matching tag names share the existing tag.
Invalid or incomplete backups are rejected rather than partially committed.

**Clear all** permanently removes library data while keeping preferences. Export a JSON backup
first if you may need the data again; read the confirmation carefully. Clearing the library is
not part of ordinary backup or restore.

For this product, the live profile normally lives in `%APPDATA%\Promptly`, including
`promptly.sqlite` and possible SQLite WAL/SHM companions. Prefer the app's export flow for
portable backups. Do not edit a live database or share private profile files in bug reports.
