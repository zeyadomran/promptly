# Settings tag management — issue 22

Scope: Windows x64. Settings Tags uses the existing typed desktop bridge, TagRepository and transactional storage worker. No schema, repository or collation changes, dependencies, automated GUI tests or native runs were added.

The table displays authoritative snippet counts. Create/edit share tag-name normalization and the existing eight-color palette; SQLite decides collisions. Merge captures its source and requires an explicit current target, unions memberships and removes the source. Delete confirms that only the tag and memberships are removed. Committed tag changes refresh Settings and the existing library model; deleted filter IDs reconcile through the existing model.

Dialogs retain their captured tag and unsaved form values across catalog revisions. A disappeared source closes with a notice. Pending changes prevent repeat submission and dismissal. Accepted writes close even if the subsequent read fails; refresh retries reads only. An unconfirmed IPC outcome closes the dialog, reports uncertainty and blocks further mutation until a successful authoritative refresh. This includes resolved UNAVAILABLE/INTERNAL results from the actual preload bridge as well as thrown transport failures; confirmed validation/conflict rejections remain editable and retryable. Focus returns to the original connected control, or New tag/active Settings navigation when it disappears.

## Functional evidence

The existing real SQLite library flow was extended with observable rename/recolor, collision preservation, transactional merge rollback and membership union/counts, followed by tag-only deletion and database reopen with both snippet texts preserved. This extends coverage of existing repository behavior; it is not a claimed new red/green implementation. Temporary databases are isolated and closed before deletion. The complete strict check passed with 20 tests in 17 files and final static checks plus Windows x64 packaging passed.

## Manual qualification remaining

Rendered wide/narrow layout, palette appearance, focus return under live changes, keyboard/IME interactions, NVDA and visible multi-window refresh have not been manually exercised. Windows packaging confirms construction, not those UI outcomes. No real user profile, clipboard, native input or OS preferences were accessed. macOS is outside the current product scope; platform removal is a separate issue.
