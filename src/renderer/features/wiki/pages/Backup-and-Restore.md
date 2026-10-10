# Backup and Restore

Open **Settings → Storage** for export and import. Library data is stored locally in SQLite.

## Export a backup

1. Under **Export**, choose **JSON**.
2. Choose a destination in the Windows save dialog.
3. Keep the exported file somewhere safe before changing, upgrading, or uninstalling the app.

The JSON option exports a **v3 Promptly JSON Lines** backup containing saved Library snippets,
tags and memberships, Open/Done Queue prompts and order, original attachment bytes and metadata,
flattened drawing PNGs, editable scenes and their retained original backgrounds. Copy statistics
are included. Export remains available when Queue has content but Library is empty.

**Markdown (text only)** is a readable export of full Library and Queue text and metadata. It
omits attachment bytes and drawing scenes, names omitted files and reports their count. It is
not the restore format. Neither export includes preferences, unsaved drafts/drawing edits,
temporary Undo content, variable answers or transient bundle selections. Save entries first.

## Import a backup

1. Choose **Import JSON** and select a Promptly backup. v3 JSON Lines and legacy v1/v2 formats
   are supported.
2. Review snippet, queued-prompt, attachment, tag, membership, remapped-ID and already-present
   counts in the preview.
3. Choose **Import** to confirm or **Cancel** to leave the library unchanged.

Import adds data while keeping existing Library and Queue content. Identical versions are skipped. Different
IDs and conflicting versions are preserved, and matching tag names share the existing tag.
Saved order, attachment ownership and drawing backgrounds are restored with remapped IDs where
needed. Invalid, damaged or incomplete backups are rejected rather than partially committed.
Cancelling leaves saved content unchanged. Import does not replace application preferences.

## Clear and upgrade

**Clear all** opens **Clear all data** confirmation. Typing `CLEAR ALL` removes Library, Queue,
tags, managed attachments, unsaved drafts and Undo ownership while keeping preferences.
Export a JSON backup first if you may need saved content again. Clear is not a secure erase;
backups, database remnants and clipboard history may retain copies.

Upgrades use additive schema migrations and preserve existing Library text. Before upgrading,
keep a complete backup and the original legacy backups you already have. Older builds can
reject a newer database; reinstalling an old executable does not roll its schema back. v3 backups
are not intended for old releases. Importing v1/v2 into 1.1.0 is supported, but it does not turn
an upgraded profile back into an older schema.

For this product, the live profile normally lives in `%APPDATA%\Promptly`, including
`promptly.sqlite` and possible SQLite WAL/SHM companions. Prefer the app's export flow for
portable backups. Do not edit a live database or share private profile files in bug reports.
