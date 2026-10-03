# Issue 96: window recovery

Base: `0eee374e1eb368a85dc2496b618c5bd2cdd1c95d`.

The global Open command focuses a visible unfocused window and hides only a
focused one. Resume preserves a hidden window while the actual tray or Open
shortcut works; an existing visible/minimized taskbar window remains reachable.
Only total route loss reveals a hidden window. Requested tray preferences never
stand in for a working native recovery route.

Successful geometry persistence and an authoritative no-op clear the last save
error. A rejected write therefore no longer permanently prevents a later mode
change or orderly shutdown.

Ready ordinary windows now own an explicit renderer recovery decision. A dead
renderer offers Reload window/Quit. Reload replaces the unusable window with a
fresh sandboxed window from saved data and startup preferences. An unresponsive
renderer defaults to Keep waiting and explains that reload discards unsaved edits;
it is never replaced automatically. Responsive recovery dismisses the warning.
Quit/fatal command retirement aborts pending decisions before resource drainage,
so late responses cannot recreate a window. No storage operation is replayed.

## Functional evidence

The existing visibility flow now exercises real WindowLifecycle, window creation,
registry, shortcuts, SettingsService and an owned SQLite database. Only Electron
and global shortcut effects are controlled. It verifies recorder focus, Open
focus/hide, tray/taskbar-preserved resume, total route loss and geometry recovery
after an external SQLite trigger rejects persistence. The authoritative no-op
path also succeeds, and known geometry survives reopen. Initial red assertions
showed visible unfocused windows hiding, tray-backed hidden windows appearing,
minimized taskbar windows being restored and recovered saves retaining stale
geometry errors.

No existing canonical flow owned renderer failure decisions. One distinct public
lifecycle flow controls Electron renderer health and dialog choices while keeping
window creation, registry, settings and storage real. Initial renderer failure
produced no notice. The flow now verifies explicit waiting retains the same
window, responsive recovery dismisses the pending warning, crash reload returns a
fresh visible/focused window, command retirement rejects a late reload decision
and saved library text survives database reopen. It does not assert private maps,
helper implementation or incidental callback counts.

`npm run check` passed with 25 functional files / 29 tests, strict type checks,
lint, architecture and formatting. Current lockfile installation reported zero
audit vulnerabilities. Installer construction and independent review are tracked
on the PR.

No installed application, user profile, physical input, clipboard or native UI was
operated. Controlled Electron effects do not qualify actual renderer process
termination, native dialog behavior, OS focus, suspend/resume or accessibility.
Those remain bounded manual release checks coordinated separately.
