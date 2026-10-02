# Windows-only scope change (#55)

The maintained runtime and distribution target is Windows x64. The macOS native
selection/keyboard helpers, adapters, permissions bridge, Dock preference/effects,
workspace placement and animation paths are removed. CI retains Windows
functional/static/package checks, Linux workflow validation and CodeQL tooling.
Original supplied designs and historical verification receipts remain unchanged.

The existing Settings canonical flow was extended test-first: an owned database
contains the obsolete showDockIcon row and valid CommandOrControl/Super preferences.
The no-Dock snapshot assertion failed before schema removal, then passed with
unchanged other preferences after commit/reopen. Unknown stored rows remain in
SQLite; no migration, database reset or user-profile operation is introduced.
The existing shortcut transaction flow verifies Windows registration aliases and
rollback against real Settings storage and an external OS boundary fake. Win/Super
modifier support remains valid.

Local verification on Windows x64: npm run check passed all 19 functional cases
and architecture/type/lint/format checks; npm run package built Promptly-win32-x64
with both Windows native executables outside ASAR. Direct Forge package invocations
with --platform=darwin and --arch=arm64 each failed in generateAssets before asset
build or artifact creation. Only Promptly-win32-x64 was emitted. No application,
keyboard hook, selection provider or OS preference operation was launched.

This proves service compatibility, platform pruning and artifact construction.
Actual Windows UI, shortcut/capture/source behavior, clipboard safety/fidelity,
latency and release accessibility remain manual qualification. The native Windows path of capture #13 is implemented; safe fallback #12 and
feedback #15 remain unresolved. Removing macOS does not qualify those flows or
erase historical failures.

## Composed integration

Main a11142f (approved capture PR56 and Settings tag PR57) was normally merged.
Bootstrap retains the single library mutation owner, synchronous capture admission
and tickets, committed preview/source registry, clear/import invalidation, and
entered capture/copy/transfer draining before Settings/storage/native shutdown.
The only change to incoming capture modules removes obsolete macOS permission
fields from the canonical test's readiness frame. Settings tag management is
unchanged. P11 combines the Windows policy with the implemented native checkpoint
and explicit pending fallback/feedback/manual qualification; the other22 updated
issue-body snapshots retain their supplied scope.

The composed npm run check passed20 functional cases across17 files and321
handwritten modules; Windows x64 npm run package passed. No GUI/native/clipboard
operation was run. Historical receipts and supplied designs remain unchanged.
